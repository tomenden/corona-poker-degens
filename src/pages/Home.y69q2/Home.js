import wixData from 'wix-data'

$w.onReady(async function () {
    const lastUpdatedText = $w("#text17")
    const {items: [
        {_createdDate: gameDate, updatedBy: UPDATED_BY}
    ]} = await wixData.query('games').limit(1).find()
    lastUpdatedText.text = `Last updated game was updated at ${gameDate}`
})