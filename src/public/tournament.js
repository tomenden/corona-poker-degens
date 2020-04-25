const PAYOUT_TABLE = [
    {numPlayers: 3, payouts: [1]},
    {numPlayers: 7, payouts: [0.7, 0.3]},
    {numPlayers: 13, payouts: [0.5, 0.3, 0.2]},
    {numPlayers: 20, payouts: [0.4, 0.25, 0.2, 0.15]} //we will need to add more if we get more players
]

export function getNumPlacesPaid(numPlayersInGame) {
    const {payouts} = PAYOUT_TABLE.find(({numPlayers}) => numPlayersInGame <= numPlayers) || PAYOUT_TABLE[3]
    return payouts.length
}

export function calcPayout(n, buyin = 50) {
    const totalMoney = n * buyin;
    const payoutStrategy = PAYOUT_TABLE.find(({numPlayers}) => n <= numPlayers)
    const {payouts} = payoutStrategy
    return payouts.map(factor => Math.round((totalMoney * factor)) - buyin)
}