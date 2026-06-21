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

interface SteamPlayerAchievementsResponse {
  playerstats?: {
    success?: boolean;
    error?: string;
    achievements?: { apiname: string; achieved: number; unlocktime: number }[];
  };
}

interface SteamSchemaResponse {
  game?: {
    availableGameStats?: {
      achievements?: { name: string; displayName?: string; description?: string; icon?: string; icongray?: string }[];
    };
  };
}

interface SteamGlobalPercentagesResponse {
  achievementpercentages?: {
    achievements?: { name: string; percent: number }[];
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

async function handleAchievements(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const apiKey = (searchParams.get('key') || '').trim();
  const idInput = (searchParams.get('steamId') || '').trim();
  const appId = (searchParams.get('appid') || '').trim();

  if (!apiKey || !idInput || !appId || !/^\d+$/.test(appId)) {
    return NextResponse.json(
      { success: false, error: 'Missing Steam API key, Steam ID, or app ID.' },
      { status: 400 }
    );
  }

  let steamId64: string | null;
  try {
    steamId64 = await resolveSteamId64(idInput, apiKey);
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach the Steam API.' }, { status: 502 });
  }
  if (!steamId64) {
    return NextResponse.json({ success: false, error: `Couldn't resolve "${idInput}" to a Steam profile.` }, { status: 404 });
  }

  try {
    const [achRes, schemaRes, globalRes] = await Promise.all([
      fetch(`${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${encodeURIComponent(apiKey)}&steamid=${steamId64}&appid=${appId}&l=english`),
      fetch(`${STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${encodeURIComponent(apiKey)}&appid=${appId}&l=english`),
      fetch(`${STEAM_API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`),
    ]);

    if (achRes.status === 403) {
      return NextResponse.json({ success: false, error: 'Steam rejected this API key.' }, { status: 403 });
    }

    const achData: SteamPlayerAchievementsResponse = achRes.ok ? await achRes.json() : {};
    const schemaData: SteamSchemaResponse = schemaRes.ok ? await schemaRes.json() : {};
    const globalData: SteamGlobalPercentagesResponse = globalRes.ok ? await globalRes.json() : {};

    if (!achData.playerstats?.success || !achData.playerstats.achievements) {
      // Most commonly: "Requested app has no stats", or a private game-details
      // setting blocking this specific title. Not an error — just no data.
      return NextResponse.json({ success: true, hasStats: false, achievements: [], unlocked: 0, total: 0 });
    }

    const schemaByName = new Map(
      (schemaData.game?.availableGameStats?.achievements || []).map(a => [a.name, a])
    );
    const globalByName = new Map(
      (globalData.achievementpercentages?.achievements || []).map(a => [a.name, a.percent])
    );

    const achievements = achData.playerstats.achievements.map(a => {
      const schema = schemaByName.get(a.apiname);
      return {
        apiName: a.apiname,
        displayName: schema?.displayName || a.apiname,
        description: schema?.description || '',
        icon: schema?.icon || '',
        iconGray: schema?.icongray || '',
        achieved: a.achieved === 1,
        unlockTime: a.unlocktime || 0,
        globalPercent: globalByName.has(a.apiname) ? globalByName.get(a.apiname) ?? null : null,
      };
    });

    return NextResponse.json({
      success: true,
      hasStats: true,
      achievements,
      unlocked: achievements.filter(a => a.achieved).length,
      total: achievements.length,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach the Steam API. Try again in a moment.' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('mode') === 'achievements') {
    return handleAchievements(request);
  }

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
