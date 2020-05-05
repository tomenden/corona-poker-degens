import {cancel} from 'backend/games';
import wixUsers from 'wix-users';
import {keyBy} from 'lodash';
import wixLocation from 'wix-location';

const ALLOWED = keyBy(['Admin', 'Game Manager'])
const canCancel = async () => {
    try{
        const roles = await wixUsers.currentUser.getRoles()
        return !!roles.find(({name}) => ALLOWED[name])
    }catch(e){
        return false
    }
}

$w.onReady(async function () {
    const currentGame = $w('#dynamicDataset').getCurrentItem()
    $w('#title').text = `This game had ${currentGame.numPlayers} players`

    const cancelGame = $w('#cancel')
    const hasPermission = await canCancel()
    if (hasPermission) {
        cancelGame.show()
        cancelGame.enable()
    } else {
        cancelGame.hide()
        cancelGame.disable()
    }
    cancelGame.onClick(async () => {
        const itemId = currentGame._id
        try {
            const result = await cancel(currentGame._id)
            console.log(`game ${itemId} was cancelled successfully:`, result)
            wixLocation.to('/totals')
        } catch(e) {
            console.log(`game ${itemId} was not cancelled successfully, see the error below`)
            console.error(e)
        }
    })
})