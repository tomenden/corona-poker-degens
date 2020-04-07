import wixData from 'wix-data'

$w.onReady(async function () {
    const lastUpdatedText = $w("#text19")
    const {items} = await wixData.query('games').limit(1).find()
    const [{_createdDate: gameDate, updatedBy: UPDATED_BY}] = items
    lastUpdatedText.text = `Last updated game was updated at ${gameDate}
    Game results were updated by ${UPDATED_BY}`
})