import wixData from 'wix-data'

export async function results_afterInsert(item, context) {
	const {player, result/*, gameId*/} = item
	const playerData = (await wixData.query('players').eq('name', player).find()).items[0]
	playerData.total = playerData.total + result
	await wixData.update('players', playerData)
	return item
}