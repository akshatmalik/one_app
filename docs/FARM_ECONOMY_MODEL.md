# Farm Economy and Progression Model

## Design rule

Crop care controls output. Tools increase area per action. Machines increase throughput. Automation removes repetition. Logistics determines sustainable scale.

## Scale eras

| Era | Cultivated tiles | Expected pressure |
| --- | ---: | --- |
| Manual | 1-24 | Individual actions remain comfortable |
| Row tools | 24-100 | Repeated watering, planting, and harvesting become difficult |
| Machines | 100-1,000 | Fuel, storage, unloading, and processing replace click labor |
| Automated farm | 1,000+ | Fleet routing and production throughput dominate |

The guided opening ends after the first inventory sale. Tools are not tutorial rewards. They become purchasable after the player demonstrates the workload they solve.

## Workload unlocks

| Upgrade | Availability | Price |
| --- | --- | ---: |
| Large can | 30 manual waterings and 12 active crops | 180g |
| Sickle | 20 manual harvests | 220g |
| Row plow | 16 manual tills | 260g |
| Seed drill | 30 manual plantings | 320g |
| Tractor | 100 cultivated tiles | 1,800g plus parts |
| Seeder attachment | Own a tractor | 550g plus parts |

## Crop roles

Raw profit per tile-day is `(yield * raw price - seed cost) / growth days`. Regrowing crops amortize their seed over four seasonal picks in the balance simulator.

- Wheat: low raw margin, strong milling value.
- Potato: reliable bulk crop with flexible soil.
- Carrot: fast cash but frequent labor.
- Beans: low direct margin with fertility value.
- Corn: machine-friendly processing and fuel input.
- Rice: irrigation- and soil-constrained processing crop.
- Tomato: high-value, water-intensive processing crop.
- Berries: recurring harvest labor without replanting.
- Pumpkin: long seasonal commitment with a large payout.

Crop access grows with cultivated acreage: beans at 24, corn at 40, rice at 55, and premium crops at 75 tiles.

## Market and capital

Spot-market pressure makes raw monoculture stall. Diversification spreads demand pressure. Processing protects only the volume supported by actual facility capacity; it is not a global multiplier.

The executable model is `npm run farm:economy`. It reports crop unit economics, capital purchase days, and the days each strategy reaches 24, 100, 250, 500, and 1,000 cultivated tiles.

Current target bands:

| Milestone | Target day |
| --- | ---: |
| 24 tiles | 6-10 |
| 100 tiles | 25-40 |
| 250 tiles | 50-70 |
| 500 tiles | 75-110 |
| 1,000 tiles | 100-210 depending on strategy |

Monoculture is intentionally unable to fund unrestricted growth. A diversified raw farm can eventually reach 1,000 tiles, while a well-designed processing farm reaches it substantially earlier after paying for facilities and machine logistics.
