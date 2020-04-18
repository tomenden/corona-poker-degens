// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixData from "wix-data";
import wixLocation from "wix-location";
import wixUsers from "wix-users";

$w.onReady(async function () {
  const getBuyin = () => Number($w("#buyin").value);
  const playerBase = (await wixData.query("players").find()).items;
  const allPlayersById = playerBase.reduce((_pmap, p) => {
    _pmap[p._id] = p;
    return _pmap;
  }, {});
  const checkboxGroup = $w("#checkboxGroup1");
  const text = $w("#text16");
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
  checkboxGroup.options = playerBase.map((p) => ({
    label: p.name,
    value: p._id,
  }));
  checkboxGroup.onChange(() => {
    text.text = `${checkboxGroup.value.length} Players`;
    updatePayoutText();
    updatePayoutVisibility();
    updateValidDropdownOptions();
  });

  $w("#buyin").onChange(() => updatePayoutText());

  $w("#button1").onClick(async () => {
    $w("#successIndicator").collapse();
    $w("#errorIndicator").collapse();
    try {
      const gameResults = getGamePlayerResults();
      await logGameResults(gameResults);
      await updatePlayerTotalsInDB(gameResults);
      $w("#successIndicator").expand();
      wixLocation.to("/");
    } catch (e) {
      console.log(e);
      $w("#errorIndicator").expand();
    }
  });

  function getGamePlayerResults() {
    const buyin = getBuyin();
    const [first = 0, second = 0, third = 0, fourth = 0] = calcPayout(checkboxGroup.value.length, buyin);
    const [winner, secondPlace = "", thirdPlace = "", fourthPlace = ""] = payoutInputs.map(
      dd => dd.value
    )
    const payoutResults = {
      [winner]: first,
      [secondPlace]: second,
      [thirdPlace]: third,
      [fourthPlace]: fourth
    };
    const players = checkboxGroup.value;
    return players.reduce((results, pId) => {
      results[pId] =
        typeof payoutResults[pId] !== "undefined" ? payoutResults[pId] : -buyin;
      return results;
    }, {});
  }

  async function logGameResults(gameResults) {
    const userEmail = await wixUsers.currentUser.getEmail();
    const playersInGame = Object.keys(gameResults);
    const { url } = $w("#uploadButton1").value.length
      ? await $w("#uploadButton1").startUpload()
      : { url: null };
    const { _id: gameId } = await wixData.insert("games", {
      updatedBy: userEmail,
      numPlayers: playersInGame.length,
      gameScreenshot: url,
    });
    const results = playersInGame.map((playerId) => {
      const { name: player } = allPlayersById[playerId];
      return {
        player,
        result: gameResults[playerId],
        gameId, //TODO: should be reference field??
      };
    });
    return wixData.bulkInsert("results", results);
  }

  async function updatePlayerTotalsInDB(gameResults) {
    //now updated in DB hook in data.js
    // const playerDataToUpdate = Object.keys(gameResults).map(playerId => ({
    // 	...allPlayersById[playerId],
    // 	total: allPlayersById[playerId].total + gameResults[playerId]
    // }))
    // return wixData.bulkUpdate("players", playerDataToUpdate)
  }

  function updatePayoutVisibility() {
    const numPlaces = getNumPlacesPaid();
    payoutInputs.forEach((dropdown, i) => {
      if (i < numPlaces) {
        dropdown.expand();
      } else {
        dropdown.collapse();
      }
    });
  }

  function updatePayoutText() {
    if (checkboxGroup.value.length === 0) {
      $w("#text17").text = "";
    } else {
      const [first = 0, second = 0, third = 0, fourth = 0] = calcPayout(checkboxGroup.value.length, getBuyin());

      $w("#text17").text = `
		  Payout:
		  First: ${first}
		  Second: ${second}
		  Third = ${third}
		  Fourth = ${fourth}
		  `;
    }
  }

  function updateValidDropdownOptions() {
    const playerBase = checkboxGroup.value.map((playerId) => ({
      label: allPlayersById[playerId].name,
      value: playerId,
    }));
    const alreadySelected = payoutInputs.map((dd) => dd.value);
    payoutInputs.forEach((dropdown, i) => {
      const otherSelectedValues = alreadySelected.slice();
      otherSelectedValues.splice(i, 1);
      dropdown.options = playerBase.filter(
        ({ value }) => !otherSelectedValues.includes(value)
      );
    });
  }

  const PAYOUT_TABLE = [
    {numPlayers: 3, payouts: [1]},
    {numPlayers: 7, payouts: [0.7, 0.3]},
    {numPlayers: 13, payouts: [0.5, 0.3, 0.2]},
    {numPlayers: 20, payouts: [0.4, 0.25, 0.2, 0.15]} //we will need to add more if we get more players
  ]

  function getNumPlacesPaid() {
    const n = checkboxGroup.value.length;
    const {payouts} = PAYOUT_TABLE.find(({numPlayers}) => n <= numPlayers) || PAYOUT_TABLE[3]
    return payouts.length
  }

  function calcPayout(n, buyin = 50) {
    const totalMoney = n * buyin;
    const payoutStrategy = PAYOUT_TABLE.find(({numPlayers}) => n <= numPlayers)
    const {payouts} = payoutStrategy
    payoutInputs.forEach((input, index) => {
      input.required = !!payouts[index] //required if there's a payout for this index
    })
    return payouts.map(factor => Math.round((totalMoney * factor)) - buyin)
  }
});
