// Github: https://github.com/bpunya/roll20-api/blob/master/TruePageCopy/TruePageCopy.js
// Author: PaprikaCC (Bodin Punyaprateep)

const TruePageCopy = TruePageCopy || (function () {
  const version = '1.0';
  const lastUpdate = 1489728639;

  const checkVersion = function () {
    if (!state.PageCopy) clearState();
    log(`-- True Page Copy v${version} -- [${new Date(lastUpdate * 1000)}]`);
  };

  const checkExistingWork = function () {
    if (state.PageCopy.workQueue.length) {
      printToChat('gm', `Continuing interrupted copying of ${getObj('page', state.PageCopy.sourcePage).get('name')}`);
      copyObjectsToDestination(clearState);
    } else if (state.PageCopy.active) {
      clearState();
    }
  };

  const changeDestinationPage = function (source, destination) {
    destination.set({
      name: `Copy of ${source.get('name')}`,
      showgrid: source.get('showgrid'),
      showdarkness: source.get('showdarkness'),
      showlighting: source.get('showlighting'),
      width: source.get('width'),
      height: source.get('height'),
      snapping_increment: source.get('snapping_increment'),
      grid_opacity: source.get('grid_opacity'),
      fog_opacity: source.get('fog_opacity'),
      background_color: source.get('background_color'),
      gridcolor: source.get('gridcolor'),
      grid_type: source.get('grid_type'),
      scale_units: source.get('scale_units'),
      scale_number: source.get('scale_number'),
      gridlabels: source.get('gridlabels'),
      diagonaltype: source.get('diagonaltype'),
      lightupdatedrop: source.get('lightupdatedrop'),
      lightenforcelos: source.get('lightenforcelos'),
      lightrestrictmove: source.get('lightrestrictmove'),
      lightglobalillum: source.get('lightglobalillum'),
    });
  };

  const clearState = function () {
    state.PageCopy = {
      active: false,
      secureStr: false,
      sourcePage: false,
      destinationPage: false,
      workQueue: [],
    };
  };

  const createSecureButton = function (target) {
    const randStr = getRandomString(32);
    state.PageCopy.secureStr = randStr;
    const output = `Are you sure you want to copy ${getObj('page', state.PageCopy.sourcePage).get('name')} ` +
                 `to ${getObj('page', state.PageCopy.destinationPage).get('name')}? ` +
                 'This will override all existing graphics and modify the current page to fit the source. <br>' +
                 `[Yes](!pagecopy ${randStr})` +
                 '[No](!pagecopy decline)';
    printToChat(target, output);
  };

  const copyObjectsToDestination = function (callback) {
    const workQueue = () => {
      if (state.PageCopy.workQueue.length) {
        const part = state.PageCopy.workQueue.shift();
        createObj(part.type, part.data);
        _.defer(workQueue);
      } else {
        printToChat('gm', `Finished copying the ${getObj('page', state.PageCopy.sourcePage).get('name')} page.`);
        callback();
      }
    };

    workQueue();
  };

  const findGraphics = function (source) {
    const objsToCopy = findObjs({ _pageid: state.PageCopy.sourcePage });
    const objsToCopyIds = _.map(objsToCopy, obj => obj.id);
    const orderedObjs = source.get('_zorder').split(',');
    const rawSortedObjs = [];
    _.each(orderedObjs, id => rawSortedObjs.push(objsToCopy[_.indexOf(objsToCopyIds, id)]));
    const sortedObjs = orderedObjs === [''] ? rawSortedObjs.filter(o => o) : objsToCopy;
    const preparedObjs = prepareObjects(sortedObjs);
    return preparedObjs;
  };

  const getGmPage = function (playerName) {
    return findObjs({
      _type: 'player',
      _displayname: playerName,
    })[0].get('_lastpage');
  };

  const getGraphicData = function (obj) {
    return {
      _pageid: state.PageCopy.destinationPage,
      imgsrc: obj.get('imgsrc').replace(/\/max\./g, '/thumb.').replace(/\/med\./g, '/thumb.'),
      bar1_link: obj.get('bar1_link'),
      bar2_link: obj.get('bar2_link'),
      bar3_link: obj.get('bar3_link'),
      represents: obj.get('represents'),
      left: obj.get('left'),
      top: obj.get('top'),
      width: obj.get('width'),
      height: obj.get('height'),
      rotation: obj.get('rotation'),
      layer: obj.get('layer'),
      isdrawing: obj.get('isdrawing'),
      flipv: obj.get('flipv'),
      fliph: obj.get('fliph'),
      name: obj.get('name'),
      gmnotes: obj.get('gmnotes'),
      controlledby: obj.get('controlledby'),
      bar1_value: obj.get('bar1_value'),
      bar2_value: obj.get('bar2_value'),
      bar3_value: obj.get('bar3_value'),
      bar1_max: obj.get('bar1_max'),
      bar2_max: obj.get('bar2_max'),
      bar3_max: obj.get('bar3_max'),
      aura1_radius: obj.get('aura1_radius'),
      aura2_radius: obj.get('aura2_radius'),
      aura1_color: obj.get('aura1_color'),
      aura2_color: obj.get('aura2_color'),
      aura1_square: obj.get('aura1_square'),
      aura2_square: obj.get('aura2_square'),
      tint_color: obj.get('tint_color'),
      statusmarkers: obj.get('statusmarkers'),
      showname: obj.get('showname'),
      showplayers_name: obj.get('showplayers_name'),
      showplayers_bar1: obj.get('showplayers_bar1'),
      showplayers_bar2: obj.get('showplayers_bar2'),
      showplayers_bar3: obj.get('showplayers_bar3'),
      showplayers_aura1: obj.get('showplayers_aura1'),
      showplayers_aura2: obj.get('showplayers_aura2'),
      playersedit_name: obj.get('playersedit_name'),
      playersedit_bar1: obj.get('playersedit_bar1'),
      playersedit_bar2: obj.get('playersedit_bar2'),
      playersedit_bar3: obj.get('playersedit_bar3'),
      playersedit_aura1: obj.get('playersedit_aura1'),
      playersedit_aura2: obj.get('playersedit_aura2'),
      light_radius: obj.get('light_radius'),
      light_dimradius: obj.get('light_dimradius'),
      light_otherplayers: obj.get('light_otherplayers'),
      light_hassight: obj.get('light_hassight'),
      light_angle: obj.get('light_angle'),
      light_losangle: obj.get('light_losangle'),
      light_multiplier: obj.get('light_multiplier'),
    };
  };

  const getPathData = function (obj) {
    return {
      _pageid: state.PageCopy.destinationPage,
      path: obj.get('path'),
      fill: obj.get('fill'),
      stroke: obj.get('stroke'),
      rotation: obj.get('rotation'),
      layer: obj.get('layer'),
      stroke_width: obj.get('stroke_width'),
      width: obj.get('width'),
      height: obj.get('height'),
      top: obj.get('top'),
      left: obj.get('left'),
      scaleX: obj.get('scaleX'),
      scaleY: obj.get('scaleY'),
      controlledby: obj.get('controlledby'),
    };
  };

  const getTextData = function (obj) {
    return {
      _pageid: state.PageCopy.destinationPage,
      top: obj.get('top'),
      left: obj.get('left'),
      width: obj.get('width'),
      height: obj.get('height'),
      text: obj.get('text'),
      font_size: obj.get('font_size'),
      rotation: obj.get('rotation'),
      color: obj.get('color'),
      font_family: obj.get('font_family'),
      layer: obj.get('layer'),
      controlledby: obj.get('controlledby'),
    };
  };

  const getRandomString = function (length) {
    return Math.round((Math.pow(36, length + 1) - (Math.random() * Math.pow(36, length + 1)))).toString(36).slice(1);
  };

  const handleChatInput = function (msg) {
    if (msg.type !== 'api' || !playerIsGM(msg.playerid)) return;
    const args = msg.content.split(/\s/);
    const target = msg.who.slice(0, -5);
    switch (args[0]) {
      case '!pagecopy':
        if (!args[1]) {
          if (state.PageCopy.active) {
            printToChat(target, 'Script is currently active. Please use !pagecopy reset if you want to stop.');
          } else if (!state.PageCopy.sourcePage) {
            state.PageCopy.sourcePage = getGmPage(target);
            printToChat(target, `Setting the source page to ${getObj('page', getGmPage(target)).get('name')}.`);
          } else if (state.PageCopy.sourcePage === getGmPage(target) && !state.PageCopy.secureStr) {
            printToChat(target, 'You must select a different source and destination page.');
          } else if (!state.PageCopy.secureStr) {
            state.PageCopy.destinationPage = getGmPage(target);
            createSecureButton(target);
          }
        } else {
          switch (args[1]) {
            case state.PageCopy.secureStr: {
              if (!state.PageCopy.active) {
                state.PageCopy.secureStr = false;
                preparePageCopy(state.PageCopy.sourcePage, state.PageCopy.destinationPage);
              } else {
                printToChat('target', 'Script is currently active. Please use !pagecopy reset if you want to stop.')
              }
              break;
            }
            case 'decline': {
              if (state.PageCopy.secureStr) {
                clearState();
                printToChat(target, 'Copying declined.');
              }
              break;
            }
            case 'source': {
              if (!state.PageCopy.secureStr) {
                state.PageCopy.sourcePage = getGmPage(target);
                printToChat(target, `Setting the source page to ${getObj('page', getGmPage(target)).get('name')}`);
              }
              break;
            }
            case 'help': {
              showHelp();
              break;
            }
            case 'reset': {
              printToChat(target, 'Resetting internal state.');
              clearState();
              break;
            }
            case 'debug': {
              log(state.PageCopy);
              break;
            }
            default: {
              if (args[1].length !== 32) showHelp();
              break;
            }
          }
        }
    }
  };

  const prepareObjects = function (objArr) {
    const preparedObjs = _.map(objArr, (obj) => {
      const type = obj.get('_type');
      if (type === 'graphic') return { type: 'graphic', data: getGraphicData(obj) };
      else if (type === 'path') return { type: 'path', data: getPathData(obj) };
      else if (type === 'text') return { type: 'text', data: getTextData(obj) };
      return undefined;
    });
    return preparedObjs;
  };

// This is the exposed function
// @param1 is the id of the page to be copied
// @param2 is the id of the destination page
  const preparePageCopy = function (pageid1, pageid2) {
    const originalPage = getObj('page', pageid1);
    const destinationPage = getObj('page', pageid2);
    if (!state.PageCopy.sourcePage || !state.PageCopy.destinationPage) {
      state.PageCopy.sourcePage = pageid1;
      state.PageCopy.destinationPage = pageid2;
    }

    if (state.PageCopy.active) {
      log(`True Page Copy - Script is currently copying the ${getObj('page', state.PageCopy.sourcePage).get('name')} page.`);
    } else if (!originalPage || !destinationPage) {
      log('True Page Copy - One or both of the supplied page ids do not exist.');
      clearState()
    } else if (originalPage.id === destinationPage.id) {
      log('True Page Copy - You cannot copy a page to itself.');
      clearState()
    } else {
      state.PageCopy.active = true;
      printToChat('gm', `Script is now active and copying objects from the ${originalPage.get('name')} page.`);
      changeDestinationPage(originalPage, destinationPage);
      state.PageCopy.workQueue = findGraphics(originalPage);
      copyObjectsToDestination(clearState);
    }
  };

  const showHelp = function () {
    const content = 'If you wish to use True Page Copy, enter \'!pagecopy or\' \'!pagecopy source\' ' +
                    'when you are looking at the page you want to copy from. Then move to the map ' +
                    'that you want to copy to and enter \'!pagecopy\' again. A button prompt will ' +
                    'appear asking if you want to copy the pages.';
    printToChat('gm', content);
  };

  const printToChat = function (target, content) {
    const FORMATTING_START = '';
    const FORMATTING_END = '';
    sendChat('True Page Copy', `/w ${target} <br>${FORMATTING_START}${content}${FORMATTING_END}`, null, { noarchive: true });
  };

  const registerEventHandlers = function () {
    on('chat:message', handleChatInput);
  };

  return {
    Copy: preparePageCopy,
    CheckWork: checkExistingWork,
    CheckInstall: checkVersion,
    RegisterEventHandlers: registerEventHandlers,
  };
}());

on('ready', () => {
  "use strict";

  TruePageCopy.CheckInstall();
  TruePageCopy.RegisterEventHandlers();
  TruePageCopy.CheckWork();
});