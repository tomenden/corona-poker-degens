import wixData from "wix-data";
import wixUsers from "wix-users";

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

export function calcPayout(n, buyin = 50, KObuyin = 0) {
    const totalMoney = n * buyin;
    const payoutStrategy = PAYOUT_TABLE.find(({numPlayers}) => n <= numPlayers)
    const {payouts} = payoutStrategy
    return payouts.map(factor => Math.round((totalMoney * factor)) - (buyin + KObuyin))
}

/**
 * @typedef {string} playerId
 * @typedef {number} playerGameResult
 * @typedef {Object.<playerId, playerGameResult>} GameResult
 */

/**
 *
 * @param {GameResult} gameResults
 * @param {?string} gameUrl
 * @return {Promise<wix_data.WixDataBulkResult>}
 */
export async function logResults(gameResults, gameUrl){
    const playerBase = (await wixData.query("players").find()).items;
    const allPlayersById = playerBase.reduce((_pmap, p) => {
        _pmap[p._id] = p;
        return _pmap;
    }, {});

    const userEmail = await wixUsers.currentUser.getEmail();
    const playersInGame = Object.keys(gameResults);

    const { _id: gameId } = await wixData.insert("games", {
        updatedBy: userEmail,
        numPlayers: playersInGame.length,
        gameScreenshot: gameUrl,
    });
    const results = playersInGame.map((playerId) => {
        const { name: player } = allPlayersById[playerId];
        return {
            player,
            result: gameResults[playerId],
            gameId,
        };
    });
    return wixData.bulkInsert("results", results);
}