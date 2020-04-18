// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixData from "wix-data";
import wixLocation from "wix-location";
import wixUsers from "wix-users";
import { getResultsFromScreenshot } from "backend/getResultsFromScreenshot";

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
  const payoutInputs = [firstDropdown, secondDropdown, thirdDropdown];
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

  $w("#button2").onClick(async () => {
    const uploadButton = $w("#uploadButton1");
    if (uploadButton.value.length === 0) {
      console.log("no uploaded screenshot");
      return;
    }

    const file = await uploadButton.startUpload();
    console.log(await getResultsFromScreenshot(file.url));
  });

  function getGamePlayerResults() {
    const buyin = getBuyin();
    const {
      first: firstAmount,
      second: secondAmount,
      third: thirdAmount,
    } = calcPayout(checkboxGroup.value.length, buyin);
    const [winner, secondPlace = "", thirdPlace = ""] = payoutInputs.map(
      (dd) => dd.value
    );
    const payoutResults = {
      [winner]: firstAmount,
      [secondPlace]: secondAmount,
      [thirdPlace]: thirdAmount,
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

  function getNumPlacesPaid() {
    const numPlayers = checkboxGroup.value.length;
    return numPlayers < 4 ? 1 : numPlayers < 8 ? 2 : 3;
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
      const {
        first: firstPayout = 0,
        second: secondPayout = 0,
        third: thirdPayout = 0,
      } = calcPayout(checkboxGroup.value.length, getBuyin());
      $w("#text17").text = `
		  Payout:
		  First: ${firstPayout}
		  Second: ${secondPayout}
		  Third = ${thirdPayout}
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

  function calcPayout(n, buyin = 50) {
    const totalMoney = n * buyin;
    firstDropdown.required = true;
    if (n < 4) {
      //winner takes all
      secondDropdown.required = false;
      thirdDropdown.required = false;
      return { first: totalMoney - buyin };
    } else if (n < 8) {
      // 70-30
      secondDropdown.required = true;
      return {
        first: Math.round(totalMoney * 0.7) - buyin,
        second: Math.round(totalMoney * 0.3) - buyin,
      };
    } else {
      // n>= 8 --- 50-30-20
      secondDropdown.required = true;
      thirdDropdown.required = true;
      return {
        first: Math.round(totalMoney * 0.5) - buyin,
        second: Math.round(totalMoney * 0.3) - buyin,
        third: Math.round(totalMoney * 0.2) - buyin,
      };
    }
  }
});
