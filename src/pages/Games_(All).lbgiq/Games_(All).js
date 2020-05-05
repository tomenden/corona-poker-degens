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
    const cancelGame = $w('#button1')
    const hasPermission = await canCancel()
    if (hasPermission) {
        cancelGame.show()
        cancelGame.enable()
    } else {
        cancelGame.hide()
        cancelGame.disable()
    }
    cancelGame.onClick(async e => {
        const itemId = e.context.itemId
        try {
            const result = await cancel(itemId)
            console.log(`game ${itemId} was cancelled successfully`, result)
            wixLocation.to('/totals')
        } catch (err) {
            console.log(`game ${itemId} was not cancelled successfully, see the error below`)
            console.error(err)
        }
    })
})