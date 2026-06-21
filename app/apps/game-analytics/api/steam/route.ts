import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for the Steam Web API.
 *
 * The browser can't call api.steampowered.com directly — Steam's endpoints
 * don't send CORS headers, so a same-origin route handler is the only way to
 * support a "sync my Steam library" feature client-side. The API key the user
 * supplies is forwarded per-request only; nothing is logged or persisted here.
 */

interface SteamOwnedGamesResponse {
  response?: {
    game_count?: number;
    games?: {
      appid: number;
      name?: string;
      playtime_forever?: number;
    }[];
  };
}

interface SteamPlayerSummariesResponse {
  response?: {
    players?: {
      steamid: string;
      personaname?: string;
      communityvisibilitystate?: number;
      avatarfull?: string;
    }[];
  };
}

interface SteamResolveVanityResponse {
  response?: {
    success?: number;
    steamid?: string;
    message?: string;
  };
}

const STEAM_API_BASE = 'https://api.steampowered.com';

async function resolveSteamId64(idOrVanity: string, apiKey: string): Promise<string | null> {
  if (/^\d{17}$/.test(idOrVanity)) return idOrVanity;
  const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(idOrVanity)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: SteamResolveVanityResponse = await res.json();
  if (data.response?.success === 1 && data.response.steamid) return data.response.steamid;
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = (searchParams.get('key') || '').trim();
  const idInput = (searchParams.get('steamId') || '').trim();

  if (!apiKey || !idInput) {
    return NextResponse.json(
      { success: false, error: 'Missing Steam API key or Steam ID/vanity name.' },
      { status: 400 }
    );
  }

  let steamId64: string | null;
  try {
    steamId64 = await resolveSteamId64(idInput, apiKey);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not reach the Steam API. Try again in a moment.' },
      { status: 502 }
    );
  }

  if (!steamId64) {
    return NextResponse.json(
      { success: false, error: `Couldn't resolve "${idInput}" to a Steam profile. Double-check your custom URL name or use your 17-digit SteamID64 instead.` },
      { status: 404 }
    );
  }

  try {
    const [summaryRes, ownedRes] = await Promise.all([
      fetch(`${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(apiKey)}&steamids=${steamId64}`),
      fetch(`${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(apiKey)}&steamid=${steamId64}&include_appinfo=1&include_played_free_games=1&format=json`),
    ]);

    if (summaryRes.status === 403 || ownedRes.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Steam rejected this API key. Double-check it was copied correctly from steamcommunity.com/dev/apikey.' },
        { status: 403 }
      );
    }
    if (!summaryRes.ok || !ownedRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Steam API returned an error. Try again in a moment.' },
        { status: 502 }
      );
    }

    const summaryData: SteamPlayerSummariesResponse = await summaryRes.json();
    const ownedData: SteamOwnedGamesResponse = await ownedRes.json();

    const player = summaryData.response?.players?.[0];
    const games = ownedData.response?.games;

    if (!games || games.length === 0) {
      const isPrivate = player && player.communityvisibilitystate !== 3;
      return NextResponse.json({
        success: false,
        error: isPrivate
          ? 'This Steam profile (or its game details) is private. In Steam, go to Edit Profile → Privacy Settings and set "Game details" to Public, then try again.'
          : 'No games found on this Steam account.',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      profileName: player?.personaname || null,
      games: games.map(g => ({
        appId: g.appid,
        name: g.name || `Unknown Game (${g.appid})`,
        playtimeForeverMinutes: g.playtime_forever || 0,
        headerImageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
      })),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not reach the Steam API. Try again in a moment.' },
      { status: 502 }
    );
  }
}
