import wixData from "wix-data";
import wixLocation from "wix-location";
import { filter, keyBy, values} from "lodash";

$w.onReady(async function () {
    const currentGame = $w('#dynamicDataset').getCurrentItem()
    $w('#title').text = `This game had ${currentGame.numPlayers} players`
})