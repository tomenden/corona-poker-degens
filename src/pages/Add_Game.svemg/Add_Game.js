// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixData from "wix-data";
import wixLocation from "wix-location";
import { getResultsFromScreenshot } from "backend/getResultsFromScreenshot";
import { getNumPlacesPaid, calcPayout, logResults } from "public/tournament";
import { filter, keyBy, values} from "lodash";

$w.onReady(async function () {
  const getBuyin = () => Number($w("#buyin").value);
  const getKOBounty = () => Number($w("#bounty").value);
  const isBounty = () => $w("#tourneytype").value === 'KO';

  const playerBase = (await wixData.query("players").find()).items;
  const allPlayersById = keyBy(playerBase, '_id')
  const firstDropdown = $w("#dropdown1");
  const secondDropdown = $w("#dropdown2");
  const thirdDropdown = $w("#dropdown3");
  const fourthDropDown = $w("#dropdown4");
  const payoutInputs = [firstDropdown, secondDropdown, thirdDropdown, fourthDropDown];
  payoutInputs.forEach((dropDown) => {
    dropDown.onChange(updateValidDropdownOptions);
  });
  payoutInputs.slice(1).forEach((input) => {
    input.collapse();
  });
  $w("#tourneytype").onChange(event => {
    const value = event.target.value
    switch(value){
      case 'Regular':
        $w("#bounty").collapse()
        $w("#bountydesc").collapse()
        $w("#KO").hide()
        break;
      case 'KO':
        $w("#bounty").expand()
        $w("#bountydesc").expand()
        $w("#KO").show()
        break;
    }
  })
  const repeaterData = playerBase.map(({_id, name, username}) => ({
    _id,
    name,
    username
  }));
  const repeaterDataByPlayerId = keyBy(repeaterData, '_id')

  const updateChecked = (playerId, checked) => {
    repeaterDataByPlayerId[playerId].checked = checked
    updatePayoutText()
    updatePayoutVisibility()
    updateValidDropdownOptions()
  }

  const updateCheckedByClick = event => {
    const itemId = event.context.itemId
    const $item = $w.at(event.context)
    const nextVal = !$item("#didplay").checked
    $item("#didplay").checked = nextVal
    updateChecked(itemId, nextVal)
  }

  $w("#didplay").onChange(event => {
    const itemId = event.context.itemId
    updateChecked(itemId, event.target.checked)
  })
  $w("#KO").onChange(event => {
    const itemId = event.context.itemId
    repeaterDataByPlayerId[itemId].KO = Number(event.target.value)
    updatePayoutText()
  })
  
  $w("#playername").onClick(updateCheckedByClick)
  $w("#playerusername").onClick(updateCheckedByClick)

  $w("#resultlog").onItemReady( ($item, itemData/*, index*/) => {
    $item("#didplay").checked = itemData.checked || false;
    $item("#playername").text = itemData.name;
    $item("#playerusername").text = `(${itemData.username})`;
    // @ts-ignore
    $item("#KO").min = 0; //the type is set to number!
    if (itemData.KO) {
      $item("#KO").value = itemData.KO; //the type is set to number!
    }
  });
  $w("#resultlog").data = repeaterData

  $w("#buyin").onChange(() => updatePayoutText());

  const validateBounty = () => {
    if (!isBounty()) {
      return true
    }
    const KOPayouts = filter(repeaterDataByPlayerId, 'KO').reduce((sum, {KO}) => sum + Number(KO), 0)
    const numPlayers = getNumberOfPlayers()
    return KOPayouts === numPlayers
  }

  $w("#button1").onClick(async () => {
    $w("#successIndicator").hide();
    $w("#errorIndicator").hide();
    try {
      if (!validateBounty()) {
        $w("#errorIndicator").text = 'The number of KO payouts does not equal number of players. Please update KO payouts and try again';
        $w("#errorIndicator").show();
        return
      }
      const gameResults = getGamePlayerResults();
      const { url } = $w("#uploadButton1").value.length
          ? await $w("#uploadButton1").startUpload()
          : { url: null };

      await logResults(gameResults, url);
      $w("#successIndicator").show();
      wixLocation.to("/");
    } catch (e) {
      console.log(e);
      $w("#errorIndicator").show();
    }
  });

  $w("#button2").onClick(async () => {
    const uploadButton = $w("#uploadButton1");
    if (uploadButton.value.length === 0) {
      console.log("no uploaded screenshot");
      return;
    }

    const file = await uploadButton.startUpload();
    const results = await getResultsFromScreenshot(file.url)
    results.forEach(pId => {
      repeaterDataByPlayerId[pId].checked = true
    })
    $w("#resultlog").data = values(repeaterDataByPlayerId)
    $w("#resultlog").forEachItem(($item, itemData) => {
      $item("#didplay").checked = itemData.checked || false;
    })
    updatePayoutText()
    updatePayoutVisibility()
    updateValidDropdownOptions()
    const numOfPlacesPayed = getNumPlacesPaid(getNumberOfPlayers())
    for (let i = 0; i < numOfPlacesPayed; i++) {
      $w(`#dropdown${i+1}`).value = results[i]
    }
  });

  function getNumberOfPlayers() {
    return getPlayersInGame().length
  }

  function getPlayersInGame() {
    return filter(repeaterDataByPlayerId, {checked: true}).map(({_id}) => _id)
  }

  /**
   *
   * @return {GameResult} map from playerId to result
   */
  function getGamePlayerResults() {
    const buyin = getBuyin();
    const bounty = isBounty() ? getKOBounty() : 0
    const totalBuyin = buyin + bounty
    const LOSS = -totalBuyin
    const [first = 0, second = LOSS, third = LOSS, fourth = LOSS] = calcPayout(getNumberOfPlayers(), buyin, bounty);
    const [winner, secondPlace = "", thirdPlace = "", fourthPlace = ""] = payoutInputs.map(
      dd => dd.value
    )
    const payoutResults = {
      [winner]: first,
      [secondPlace]: second,
      [thirdPlace]: third,
      [fourthPlace]: fourth
    };
    const players = getPlayersInGame();
    return players.reduce((results, pId) => {
      results[pId] =
        typeof payoutResults[pId] !== "undefined" ? payoutResults[pId] : -totalBuyin;
      results[pId] += (repeaterDataByPlayerId[pId].KO || 0) * bounty
      return results;
    }, {});
  }

  function updatePayoutVisibility() {
    const numPlaces = getNumPlacesPaid(getNumberOfPlayers());
    payoutInputs.forEach((dropdown, i) => {
      if (i < numPlaces) {
        dropdown.expand();
      } else {
        dropdown.collapse();
      }
    });
  }

  const getBountyPayoutText = () => {
    const players = filter(repeaterDataByPlayerId, 'KO')
    const bounty = getKOBounty()
    return players.map(({name, KO}) => `${name}: ${KO * bounty} (${KO})`).join('\n')
  }

  function updatePayoutText() {
    const numPlayers = getNumberOfPlayers()
    if (numPlayers === 0) {
      $w("#payouts").text = "";
    } else {
      const additionalKOFactor = isBounty() ? getKOBounty() : 0
      const LOSS = -(getBuyin() + additionalKOFactor)
      const [first = 0, second = LOSS, third = LOSS, fourth = LOSS] = calcPayout(numPlayers, getBuyin(), additionalKOFactor);
      $w("#numplayerstxt").text = `${numPlayers} Players`;
      const placementPayouts = `
		  Payout:
		  First: ${first}
		  Second: ${second}
		  Third = ${third}
		  Fourth = ${fourth}
		  `;
      const KOpayouts = isBounty() ? getBountyPayoutText() : ''
      $w("#payouts").text = `${placementPayouts}
      ${KOpayouts}`
    }
  }

  const updateRequiredDropdowns = () => {
    const numOfPlacesPayed = getNumPlacesPaid(getNumberOfPlayers())
    payoutInputs.forEach((input, index) => {
      input.required = index < numOfPlacesPayed
    })
  }

  function updateValidDropdownOptions() {
    const playerBase = getPlayersInGame().map((playerId) => ({
      label: allPlayersById[playerId].name,
      value: playerId,
    }));
    updateRequiredDropdowns()
    const alreadySelected = payoutInputs.map((dd) => dd.value);
    payoutInputs.forEach((dropdown, i) => {
      const otherSelectedValues = alreadySelected.slice();
      otherSelectedValues.splice(i, 1);
      dropdown.options = playerBase.filter(
        ({ value }) => !otherSelectedValues.includes(value)
      );
    });
  }
});
