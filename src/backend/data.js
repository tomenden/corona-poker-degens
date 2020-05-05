import wixData from 'wix-data'
import {map} from 'lodash'
import wixUsersBackend from 'wix-users-backend';

const getPlayerByName = async player => (await wixData.query('players').eq('name', player).limit(1).find()).items[0]
const getResultsForGame = async (gameId, numPlayers) => (await wixData.query('results').eq('gameId', gameId).limit(numPlayers).find()).items

export async function results_afterInsert(item, context) {
	const {player, result/*, gameId*/} = item
	const playerData = await getPlayerByName(player)
	playerData.total = playerData.total + result
	await wixData.update('players', playerData)
	return item
}

export async function results_beforeRemove(itemId, context) {
	const {currentItem: {player, result}} = context
	const playerData =  await getPlayerByName(player)
	playerData.total = playerData.total - result
	await wixData.update('players', playerData)
	return itemId
}

export async function games_beforeRemove(itemId, context) {
	const {currentItem: {gameId, numPlayers, gameScreenshot, updatedBy: gameCreatedBy}} = context
	const results =  numPlayers ? await getResultsForGame(gameId, numPlayers) : []
	let gameCancelledBy = await wixUsersBackend.currentUser.getEmail()
	await wixData.insert('cancellations', {
		results: JSON.stringify(results),
		numPlayers,
		gameScreenshot,
		gameCreatedBy,
		gameCancelledBy
	})
	await wixData.bulkRemove('results', map(results, '_id'))
	return itemId
}
