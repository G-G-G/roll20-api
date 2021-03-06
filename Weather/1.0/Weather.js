// Github: https://github.com/bpunya/roll20-api/blob/master/Weather/1.0/Weather.js
// Author: PaprikaCC (Bodin Punyaprateep)
/* Designed for use in the Roll20 API.
 * This script creates weather forecasts and outputs formatted messages to the Roll20 chat.
 */


var Weather = Weather || (function () {
  const version = 1.0;
  const lastUpdate = 1492489588;

  class Biome {
    constructor(a, b, c, d, e) {
      this.name = a;
      this.temperature = this.setup(b);
      this.windSpeed = this.setup(c);
      this.humidity = this.setup(d);
      this.precipitation = this.setup(e);
      this.setup = input => ({
        max: input[0],
        min: input[1],
        variance: input[2],
        shift: input[3] || 0,
      });
    }
  }

  class Database {
    constructor() {
      this.biome = BIOME_LIST;
      this.weather = WEATHER_LIST;
      this.cloud = CLOUD_LIST;
      this.phenomena = PHENOMENA_LIST;
      this.season = SEASON_LIST;
      this.forecasts = [];
    }
  }

  class Forecast {
    constructor(a, b, c) {
      this.day = b;
      this.time = c || Date.now();
      this.stats = {
        temperature: _.isNumber(a.temperature) ? a.temperature : null,
        windSpeed: _.isNumber(a.windSpeed) ? a.windSpeed : null,
        humidity: _.isNumber(a.humidity) ? a.humidity : null,
        precipitation: _.isNumber(a.precipitation) ? a.precipitation : null,
      };
      this.description = () => getWeatherDescription(this).replace(/<(?:.|\n)*?>/gm, '');
      this.verify = () => _.every(_.values(this.stats), value => _.isNumber(value));
    }
  }

  class InstallObj {
    constructor() {
      this.code = null;
      this.needed = true;
      this.tmp = null;
      this['biome'] = null;
      this['season'] = null;
      this['day'] = null;
      this.stageIndex = 0;
      this.stageList = ['biome', 'season', 'day', false];
    }
  }

  class PauseObj {
    constructor() {
      this.active = false;
      this.start = null;
      this.delay = 0;
    }
  }

  class StateObj {
    constructor() {
      this.biome = null;
      this.gmOnly = false;
      this.autoAdvance = false;
      this.timeSeed = Date.now();
      this.daySeed = null;
      this.seasonSeed = null;
      this.seasonDuration = 91;
      this.trendScale = 1;
      this.timeScale = 1;
      this.maxHistory = 150;
      this.lastupdated = 0;
      this.pause = new PauseObj();
      this.install = new InstallObj();
      this.database = new Database();
    }
  }

  class WeatherEffect {
    constructor(a, b, c, d) {
      this.name = a;
      this.stats = {
        temperature: b,
        windSpeed: c,
        humidity: d,
      };
    }
  }

  const SEASON_LIST = [{ name: 'Spring', id: 5 }, { name: 'Summer', id: 7 }, { name: 'Fall', id: 1 }, { name: 'Winter', id: 3 }, { name: 'None', id: 4 }];
  const BIOME_LIST = [new Biome('Metropolis', [25, -20, 2.5], [30, 10, 5, 1], [50, 30, 15, 3], [50, 30, 15])];
  const WEATHER_LIST = [new WeatherEffect('raining', 25, 20, 100), new WeatherEffect('snowing', -10, 20, 50), new WeatherEffect('foggy', 10, 0, 100), new WeatherEffect('dusty', 20, 15, 0), new WeatherEffect('hazy', 35, 0, 50), new WeatherEffect('calm', 10, 5, 5), new WeatherEffect('bitterly chilly', -30, 30, 0), new WeatherEffect('swelteringly hot', 50, 0, 0)];
  const CLOUD_LIST = [new WeatherEffect('overcast', 0, 15, 75), new WeatherEffect('clear', 0, 20, 0), new WeatherEffect('partly cloudy', 0, 20, 25), new WeatherEffect('mostly cloudy', 0, 15, 35), new WeatherEffect('still', 0, 0, 0)];
  const PHENOMENA_LIST = [new WeatherEffect('thunderstorm', 20, 50, 100), new WeatherEffect('tornado', 40, 100, 100), new WeatherEffect('hail storm', 0, 50, 33)];

/**************************************************************************************************/
/********************************** SETUP AND CHECKING FUNCTION  **********************************/
/**************************************************************************************************/

  const startup = function () {
    log(`-- Weather v${version} -- [${new Date(lastUpdate * 1000)}]`);
    if (!state.Weather) {
      printTo('gm', '<h1 style="color:#56ABE8">Weather</h1><hr>Thank you for installing Weather! Please follow the instructions in the following chat messages to set up the script to your environment.');
      log('Weather -- Thank you for installing Weather! Please see the chat log to set up the script to your environment.');
      resetState();
      handleInstall();
    } else if (state.Weather.install.needed) {
      printTo('gm', 'Resuming <strong><span style="color:#56ABE8">Weather</span></strong> installation.');
      log('Weather -- Your installation is not yet complete. Please see the chat log to continue setting up the script.');
      handleInstall();
    } else {
      checkGlobalConfig();
      printTo('chat', getWeatherDescription(getUpdatedForecast()));
    }
    return true;
  };

  const checkGlobalConfig = function () {
    const g = globalconfig.weather;
    const s = state.Weather;
    if (g && g.lastsaved && g.lastsaved > s.lastupdated) {
      s.lastupdated = g.lastsaved;
      s.timeScale = Math.max(parseFloat(g['Rate of Passing Time']), 1);
      s.seasonDuration = Math.max(parseFloat(g['In-Game Days per Season']), 0);
      s.trendScale = Math.max((parseInt(g['Season Effect Percentage'], 10) / 100), 0.01);
      s.maxHistory = Math.max(Math.min(parseInt(g['Maximum Forecasts Kept in History'], 10), 700), 10);
      s.autoAdvance = g['Automatic Time Advancement'] === 'true';
      s.gmOnly = g['GM Only'] === 'true';
    }
  };

/**************************************************************************************************/
/****************************** Chat and String Creation Functions ********************************/
/**************************************************************************************************/

  const getButton = function (message, link, style) {
    const buttonStyle = style || ' ';
    return `<a href="${link}" style="min-width:70px; text-align:center; background-color:#222; background-image:linear-gradient(#777, #222);${buttonStyle}">${message}</a>`;
  };

// Help message
  const getHelp = function (isGm) {
    return '<div>' +
            '<strong><h1 style="text-align:left;color:#56ABE8">Weather</h1></strong>' +
            '<p style="text-align:left;font-size:75%;">' +
              'The following is a list of all current settings.' +
            '</p>' +
          '</div>' +
          '<div style="color:#000000;background-color:#FFF">' +
            '<hr style="background:#000000; border:0; height:7px" />' +
            '<ul><b>Automatic Weather Updates</b>:<br>' +
              `${state.Weather.autoAdvance ? 'Passage of time is observed' : 'Weather must be updated manually'}</ul>` +
            '<ul><b>Player Access</b>:<br>' +
              `${state.Weather.gmOnly ? 'Players can only view the weather' : 'Players can access some extra Weather functions'}</ul>` +
          '</div>' +
          '<div style="">' +
            '<p style="font-size:90%;">' +
              'To use <span style="color:#56ABE8">Weather</span> as a macro or chat command, follow this format:' +
              '<br>' +
              '<span style="color:#56ABE8">!weather</span><br>' +
              'or<br>' +
              '<span style="color:#56ABE8">!weather [option [optionValue]]</span>' +
            '</p>' +
          '</div>';
  };

// Returns a description of the forecast
  const getWeatherDescription = function (forecast) {
    const f = forecast.stats;
    const weatherCondition = getClosestEffect('weather', f);
    const cloudCondition = getClosestEffect('cloud', f);
    const phenomena = getClosestEffect('phenomena', f, 100);
    const humidity = f.humidity < 5 ? 'dry' : f.humidity < 15 ? 'calm' : f.humidity < 30 ? 'moist' : 'wet';
    const temperature = f.temperature < 5 ? 'chilly' : f.temperature < 15 ? 'mild' : f.temperature < 30 ? 'hot' : 'blisteringly hot';
    const windSpeed = f.windSpeed < 5 ? 'very light' : f.windSpeed < 15 ? 'light' : f.windSpeed < 30 ? 'moderate' : 'heavi';
    const precipitation = f.precipitation < 10 ? '' : f.precipitation < 30 ? 'lightly' : f.precipitation < 75 ? 'heavily' : f.precipitation < 150 ? 'non-stop' : 'like a monsoon';
    const headerColour = getTemperatureColour(f.temperature, 1);
    const header = `It's ${cloudCondition} and ${weatherCondition}`;
    const textColour = getTemperatureColour(f.temperature, 0.75);
    const text = `It is ${temperature} and ${humidity} here, and the wind blows ${windSpeed}ly against you. ${precipitation ? `It has been raining ${precipitation} for the last while.` : ''} ${phenomena ? `Because of current conditions, a ${phenomena} is likely to occur if it isn't already happening.` : ''}`;
    return `<h1 style="color:${headerColour}">${header}. </h1><hr><p style="color:${textColour}">${text}</p>`;
  };

  const printTo = function (target, content, plain) {
    const FORMATTING_START = !plain ? '<div style="box-shadow:-3px 3px 4px #999; background-color:#CCC; border-style:solid; border-width:1px; padding:10px; background-image:linear-gradient(135deg, #FFFFCD, #CDFFFF);"><div style="border-width:5px; border-style:solid; border-color:#777; background-color:#FFF; padding:10px;">' : '';
    const FORMATTING_END = !plain ? '</div></div>' : '';
    if (target === 'chat') {
      sendChat('', `/desc ${FORMATTING_START}${content}${FORMATTING_END}`);
    } else {
      sendChat('Weather', `/w ${target} <br>${FORMATTING_START}${content}${FORMATTING_END}`, null, { noarchive: true });
    }
  };

/**************************************************************************************************/
/********************************* Object Manipulation Functions **********************************/
/**************************************************************************************************/

// Adds the forecast object to state after checking some stuff
  const addToDatabase = function (forecast) {
    const s = state.Weather;
    if (forecast.verify()) {
      if (s.database.forecasts.length >= s.maxHistory) {
        const toTrim = (s.database.forecasts.length + 1) - s.maxHistory;
        s.database.forecasts = [...s.database.forecasts.slice(toTrim)];
      }
      s.database.forecasts.push(forecast);
    } else {
      throw new Error('Forecast is malformed.');
    }
  };

/* Creates a new WeatherEffect object and pushes it to the proper state database
  const createNewEffect = function (type, name, temperature, windSpeed, humidity) {
    if (!type) return printTo('gm', 'No input found.');
    if (_.find(state.Weather.database[type], obj => obj.name === name)) {
      return printTo('gm', 'You must use a unique name.');
    }
    let inputArray;
    switch (type) {
      case 'biome': {
        try {
          inputArray = JSON.parse(`[${temperature}, ${windSpeed}, ${humidity}]`);
        } catch (e) {
          printTo('gm', 'One of the values entered was invalid.');
          break;
        }
        if (inputArray.every(stat => stat.length >= 3 && stat.every(value => parseFloat(value) === value))) {
          const newEffect = new WeatherEffect(name, ...inputArray);
          state.Weather.database[type].push(newEffect);
          printTo('gm', `Adding a new ${type} called ${name}.`);
          break;
        }
        printTo('gm', 'One of the values entered was invalid.');
        break;
      }
      case 'weather':
      case 'cloud':
      case 'phenomena': {
        try {
          inputArray = JSON.parse(`[${temperature}, ${windSpeed}, ${humidity}]`);
        } catch (e) {
          printTo('gm', 'One of the values entered was not a number.');
          break;
        }
        if (inputArray.every(value => parseFloat(value) === value)) {
          const newEffect = new WeatherEffect(name, ...inputArray);
          state.Weather.database[type].push(newEffect);
          printTo('gm', `Adding a new ${type} called ${name}.`);
          break;
        }
        printTo('gm', 'One of the values entered was not a number.');
        break;
      }
      default: {
        printTo('gm', 'You need to specify the type of effect you want to add. Your options are "biome, "weather", "cloud", and "phenomena".');
      }
    }
  };
*/

// Creates a new weather object and pushes it to the state database.
// Also returns the object created.
  const createNewForecast = function () {
    const s = state.Weather;
    const prev = getLastForecast();
    const overallDay = prev.day + 1;
    const trend = {
      temperature: getSeasonTrend('temperature', overallDay),
      windSpeed: getSeasonTrend('windSpeed', overallDay),
      humidity: getSeasonTrend('humidity', overallDay),
      precipitation: getSeasonTrend('precipitation', overallDay),
    };
    const newStats = {
      temperature: getValueChange((prev.stats.temperature + trend.temperature) / 2, s.biome.temperature.variance),
      windSpeed: getValueChange((prev.stats.windSpeed + trend.windSpeed) / 2, s.biome.windSpeed.variance),
      humidity: getValueChange((prev.stats.humidity + trend.humidity) / 2, s.biome.humidity.variance),
      precipitation: getValueChange((prev.stats.precipitation + trend.precipitation) / 2, s.biome.precipitation.variance),
    };
    const currentWeather = new Forecast(normalizeForecastStats(newStats), overallDay);
    log(`Weather -- Creating a forecast for day ${overallDay}`);
    addToDatabase(currentWeather);
    return currentWeather;
  };

// Handles forecast Creation
  const handleForecastCreation = function (iteration) {
    if (iteration > 1) {
      createNewForecast();
      return handleForecastCreation(iteration - 1);
    }
    return createNewForecast();
  };

// Changes the stats for the latest weather forecast (if valid)
  const modifyLatestForecast = function (args) {
    const s = state.Weather;
    const parsedArgs = _.chain(args)
                        .map((item) => {
                          const stat = item.split(':');
                          return { name: stat[0], value: stat[1] };
                        })
                        .reject(stat => parseFloat(stat.value).toString() !== stat.value)
                        .filter(stat => _.contains(_.keys(getLastForecast().stats), stat.name))
                        .filter(stat => stat.name === 'temperature' || parseFloat(stat.value) >= 0)
                        .filter(stat => stat.name !== 'humidity' || parseFloat(stat.value) <= 100)
                        .value();
    if (!parsedArgs.length) return printTo('gm', 'No valid input found.');
    if (!getLastForecast()) return printTo('gm', 'You haven\'t made any forecasts yet.');
    const message = _.reduce(parsedArgs, (m, stat) => {
      m += ` ${stat.name} to ${stat.value}`;
      return m;
    }, 'Changing the following values on the latest forecast:');
    const newStats = _.reduce(parsedArgs, (m, stat) => { m[stat.name] = parseFloat(stat.value); return m; }, {});
    s.database.forecasts[s.database.forecasts.length - 1].stats = Object.assign(getLastForecast().stats, newStats);
    printTo('gm', message);
  };

/* Removes the effect with the name given
  const removeEffect = function (type, ...input) {
    if (!type) return printTo('gm', 'No input found.');
    const name = input.join(' ');
    if (_.find(state.Weather.database[type], effect => effect.name === name)) {
      state.Weather.database[type] = _.reject(state.Weather.database[type], obj => obj.name === name);
      return printTo('gm', `Deleting the ${type} named ${name}.`);
    } else {
      return printTo('gm', `There is no ${type} named ${name} to delete.`);
    }
  };
*/

/**************************************************************************************************/
/********************************* MATH AND COMPARISON FUNCTIONS **********************************/
/**************************************************************************************************/

// Returns the closest object to the given array
  const getClosestEffect = function (type, obj, range) {
    if (!state.Weather.database[type]) return undefined;
    const closestEffect = _.chain(state.Weather.database[type])
                           .map(effect => ({
                             name: effect.name,
                             distance: _.keys(effect.stats).reduce((m, p) => {
                               m += (effect.stats[p]) ? (Math.abs(effect.stats[p] - obj[p])) : (0);
                               return m;
                             }, 0),
                           }))
                           .sortBy(effect => effect.distance)
                           .first()
                           .value();
    if (!range || closestEffect.distance < range) return closestEffect.name;
    return undefined;
  };

// Returns a hex code given a percentage from 0 to 100;
  const getColourHex = function (percent) {
    const toHex = (c) => { const hex = c.toString(16); return hex.length === 1 ? '0' + hex : hex; };
    let r = 30;
    let g = 30;
    let b = 30;
    if (percent < 50) {
      b = Math.round(225 * (Math.abs(percent - 50) / 50)) + 30;
      g = Math.round(112.5 * (Math.abs(percent - 50) / 50)) + 30;
    } else if (percent > 50) {
      r = Math.round(200 * (Math.abs(percent - 50) / 50)) + 30;
      g = Math.round(100 * (Math.abs(percent - 50) / 50)) + 30;
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  };

// Returns the amount of full in-game days elapsed between the two inputs
  const getDaysElapsed = function (originalTime, newTime) {
    return Math.floor((newTime - originalTime - state.Weather.pause.delay) /
                      (86400 / state.Weather.timeScale * 1000));
  };

  const getRandomString = function (length) {
    return Math.round((36 ** (length + 1)) - (Math.random() * (36 ** (length + 1)))).toString(36).slice(1);
  };

// Returns a value based on a cosine curve where wave period is equal to the length of a year
  const getSeasonTrend = function (type, day) {
    const s = state.Weather;
    const skew = (s.biome[type].max + s.biome[type].min) / 2;
    const range = (s.biome[type].max - s.biome[type].min) / 2;
    const seedShift = s.seasonSeed * (Math.PI / 4);
    const biomeShift = (s.biome[type].shift * 2 * (Math.PI / 4)) || 0;
    const time = ((day + s.daySeed) / s.seasonDuration) * (Math.PI / 2);
    return skew + (range * Math.cos(time + seedShift + biomeShift));
  };

// Does some math to figure out how temp cold/warm something is, then returns the hex code for it.
  const getTemperatureColour = function (temperature, intensity) {
    const coldStart = 5;
    const coldMax = -20;
    const hotStart = 15;
    const hotMax = 40;
    let percent = 50;
    if (temperature <= coldStart) {
      percent = temperature <= coldMax ? 0
        : (50 / (coldStart - coldMax) * temperature) + 50 - (50 / (coldStart - coldMax) * coldStart);
    } else if (temperature >= hotStart) {
      percent = temperature >= hotMax ? 100
        : (50 / (hotMax - hotStart) * temperature) + 50 - (50 / (hotMax - hotStart) * hotStart);
    }
    return getColourHex(((percent - 50) * intensity) + 50);
  };

// Returns a new value depending on the original value, deviation and iterations to run
  const getValueChange = function (mu, sigma) {
    return normalInverse(Math.random(), mu, sigma * state.Weather.trendScale);
  };

  const normalizeForecastStats = function (stats) {
    // Humidity scale ensures that precipitation * humidity * 2 until humidity is 50 or higher.
    const humidityScale = stats.humidity <= 0 ? 0 : stats.humidity > 50 ? 100 : stats.humidity * 2;
    return {
      temperature: Math.round(stats.temperature),
      windSpeed: Math.max(Math.round(stats.windSpeed), 0),
      humidity: Math.max(Math.min(Math.round(stats.humidity), 100), 0),
      precipitation: Math.max(Math.round(stats.precipitation * humidityScale / 100), 0),
    };
  };

/**************************************************************************************************/
/*************************************** Forecast Handlers ****************************************/
/**************************************************************************************************/

// API error handlers //
  const apiAdvanceWeather = function (input) {
    try {
      return advanceWeather(input);
    } catch (e) {
      const error = e.stack.split(/\n/).join('');
      log(`Weather.Advance() encountered an error -- ${e.message}`);
      log(`${error.substr(0, error.indexOf('eval at'))}...)`);
      return undefined;
    }
  };

  const apiGetLastForecast = function () {
    try {
      return getLastForecast();
    } catch (e) {
      const error = e.stack.split(/\n/).join('');
      log(`Weather.GetLastest() encountered an error -- ${e.message}`);
      log(`${error.substr(0, error.indexOf('eval at'))}...)`);
      return undefined;
    }
  };

  const apiGetSpecificForecast = function (input) {
    try {
      return getSpecificForecast(input);
    } catch (e) {
      const error = e.stack.split(/\n/).join('');
      log(`Weather.Get() encountered an error -- ${e.message}`);
      log(`${error.substr(0, error.indexOf('eval at'))}...)`);
      return undefined;
    }
  };

  const apiGetUpdatedForecast = function () {
    try {
      return getUpdatedForecast();
    } catch (e) {
      const error = e.stack.split(/\n/).join('');
      log(`Weather.GetUpdate() encountered an error -- ${e.message}`);
      log(`${error.substr(0, error.indexOf('eval at'))}...)`);
      return undefined;
    }
  };

// Advances time if Weather isn't paused, and returns the relevant weather object.
  const advanceWeather = function (input) {
    const desiredDays = Math.floor(parseInt(input, 10)) || 0;
    const daysSinceLast = getDaysElapsed(getLastForecast().time, Date.now());
    if (!state.Weather.pause.active && (desiredDays > 0 || daysSinceLast > 0)) {
      if (desiredDays > daysSinceLast) {
        return handleForecastCreation(desiredDays);
      }
      return handleForecastCreation(daysSinceLast);
    }
    return getLastForecast();
  };

// Returns the latest weather forecast
  const getLastForecast = function () {
    const o = state.Weather.database.forecasts.slice(-1)[0];
    return o ? new Forecast(o.stats, o.day, o.time) : undefined;
  };

// Returns a specific forecast from state
  const getSpecificForecast = function (input) {
    const o = _.find(state.Weather.database.forecasts, forecast => forecast.day === input || forecast.time === input);
    return o ? new Forecast(o.stats, o.day, o.time) : undefined;
  };

// Checks to see if we need to update. If yes, return a new forecast. Otherwise return the latest.
  const getUpdatedForecast = function () {
    const daysSinceLast = getDaysElapsed(getLastForecast().time, Date.now());
    if (!state.Weather.pause.active && state.Weather.autoAdvance && daysSinceLast > 0) {
      return handleForecastCreation(daysSinceLast);
    }
    return getLastForecast();
  };

/**************************************************************************************************/
/***************************************** Input Handlers *****************************************/
/**************************************************************************************************/

// Error Handler //
  const handleChatError = function (msg) {
    if (msg.type !== 'api') return;
    try {
      handleChatInput(msg);
    } catch (e) {
      const error = e.stack.split(/\n/).join('<br>');
      const user = playerIsGM(msg.playerid) ? msg.who.replace(/( \(GM\)$)/g, '') : msg.who;
      sendChat('Weather -- Error Handler', `/w ${user} <br><h3>Something went wrong!</h3><p>${e.message}</p><div style="background-color:#FFCCCC; padding:5px; border-size:1px; border-style:dotted;"><p style="color:#771000; font-size:70%;">${error.substr(0, error.indexOf('eval at'))}...)</p></div>`, null, { noarchive: true });
    }
  };

// Chat Handler //
  const handleChatInput = function (msg) {
    const args = msg.content.split(/\s/);
    if (args[0].toLowerCase() === '!weather') {
      const s = state.Weather;
      const user = playerIsGM(msg.playerid) ? msg.who.replace(/( \(GM\)$)/g, '') : msg.who;
      switch (args[1]) {
        case s.install.code: {
          if (!playerIsGM(msg.playerid)) return;
          else handleInstall(args[2]);
          break;
        }
        /*
        case 'add': {
          if (!playerIsGM(msg.playerid)) return;
          else createNewEffect(...args.slice(2));
          break;
        }
        */
        case 'advance': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else if (s.pause.active) printTo(user, 'Weather is currently paused. You must resume the script before you can advance the day.');
          else printTo('chat', getWeatherDescription(advanceWeather(args[2])));
          break;
        }
        case 'clear': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else if (args[2] === s.install.code) {
            s.database.forecasts = [getLastForecast()];
            s.install.code = null;
            printTo('gm', 'Clearing the forecast history!');
          } else {
            const secureString = getRandomString(32);
            s.install.code = secureString;
            printTo(user,
              'Are you sure you want to clear the forecast history?<hr>' +
              getButton('Yes', `!weather clear ${secureString}`) +
              getButton('No', '!weather decline')
            );
          }
          break;
        }
        case 'debug': {
          if (!playerIsGM(msg.playerid)) return;
          switch (args[2]) {
            case 'reset': {
              resetState();
              break;
            }
            case 'forecast': {
              log(s.database.forecasts[s.database.forecasts.length - 1]);
              break;
            }
            case 'history': {
              log(s.database.forecasts);
              break;
            }
            default: {
              log(s);
            }
          }
          break;
        }
        case 'decline': {
          if (!playerIsGM(msg.playerid) || s.install.needed) return;
          s.install.code = null;
          printTo(user, 'Action declined.');
          break;
        }
        case 'help': {
          printTo(user, getHelp(playerIsGM(msg.playerid)));
          break;
        }
        case 'history':
        case 'past': {
          if (!playerIsGM(msg.playerid) && s.gmOnly) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else if (args[2]) {
            const pastForecast = _.find(s.database.forecasts, forecast => forecast.day === parseFloat(args[2]));
            if (pastForecast) {
              printTo(user, getWeatherDescription(pastForecast));
            } else {
              printTo(user, 'The forecast selected does not exist.');
            }
          } else {
            const message = _.reduce(s.database.forecasts, (m, forecast) => {
              m += getButton(`Day ${forecast.day + s.daySeed}`, `!weather history ${forecast.day}`);
              return m;
            }, '<h1 style="color:#56ABE8">Past Forecasts</h1> Please select a previous forecast to see what happened on that day.<hr>');
            printTo(user, message);
          }
          break;
        }
        case 'move': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else if (args[2]) {
            if (_.find(s.database.biome, item => item.name === args[2])) {
              s.biome = _.find(s.database.biome, item => item.name === args[2]);
              printTo('gm', `Changing the biome to ${args[2]}.`);
            } else {
              printTo(user, `The ${args[2]} biome doesn't exist.`);
            }
          } else {
            const message = _.reduce(s.database.biome, (m, biome) => {
              m += getButton(biome.name, `!weather move ${biome.name}`); return m;
            }, '') || '<p style="font-size:60%">~ tumbleweed noises ~</p>';
            printTo(user, 'Please select the biome that your players are moving to.<hr>' + message);
          }
          break;
        }
        case 'next': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else if (s.pause.active) printTo(user, 'Weather is currently paused. You must resume the script before you can advance the day.');
          else printTo('chat', getWeatherDescription(advanceWeather(1)));
          break;
        }
        case 'pause':
        case 'stop': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else handlePause(true);
          break;
        }
        case 'reinstall': {
          if (!playerIsGM(msg.playerid)) return;
          const secureString = getRandomString(32);
          s.install.code = secureString;
          printTo(user, 'Are you sure you want to reset all information? <br>' + getButton('Yes', `!weather ${secureString} reinstall`) + getButton('No', '!weather decline'));
          break;
        }
        /*
        case 'remove':
        case 'delete':
        case 'destroy': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else removeEffect(...args.slice(2));
          break;
        }
        */
        case 'resume':
        case 'start':
        case 'unpause': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else handlePause(false);
          break;
        }
        case 'set':
        case 'change': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else modifyLatestForecast(args.slice(2));
          break;
        }
        case 'update':
        case 'print': {
          if (!playerIsGM(msg.playerid)) return;
          if (s.install.needed) printTo(user, 'Please complete the installation.');
          else printTo('chat', getWeatherDescription(getUpdatedForecast()));
          break;
        }
        default: {
          if (s.install.needed) {
            const secureString = getRandomString(32);
            s.install.code = playerIsGM(msg.playerid) ? secureString : s.install.code;
            printTo(user, `Weather hasn't been fully installed yet. ${playerIsGM(msg.playerid) ? '<hr>' + getButton('Continue Installation', `!weather ${secureString}`) : 'Message your GM to let them know!'}`);
          } else if (args.length === 1) {
            printTo(user, getWeatherDescription(getUpdatedForecast()));
          } else {
            printTo(user, getHelp(playerIsGM(msg.playerid)));
          }
        }
      }
    }
  };

// Handles all installation stages
  const handleInstall = function (input) {
    if (input === 'reinstall') resetState();
    const s = state.Weather;
    const secureString = getRandomString(32);
    const getQuestionOptions = (list, statement) => _.reduce(s.database[list], (m, item) => {
      m += getButton(`${item.name}`, `!weather ${secureString} ${item.name}`);
      return m;
    }, `${statement}<hr>`);
    let stage = s.install.stageList[s.install.stageIndex];
    const reply = {
      biome: getQuestionOptions('biome', 'Please select the biome that most closely resembles where your players are. This can be changed later.'),
      season: getQuestionOptions('season', 'Please select the season that your characters are experiencing; you will select the exact day in the season after this question. If you want to set the day of the year instead, please select "None".'),
      day: 'Please enter the current day to describe where you are in the season or year<hr>' + getButton('Current Day', `!weather ${secureString} ?{Please enter a day|0}`),
      confirmation: `You said that the ${stage} is ${input}. Is that what you wanted?<hr>` + getButton('Yes', `!weather ${secureString} accept`) + getButton('No', `!weather ${secureString} decline`),
      finished: '<h1 style="color:#56ABE8">Installation complete!</h1>Get your first weather description with the command <span style="color:#56ABE8">!weather</span>. If you\'ve made a mistake somewhere, you can fix it with the command <span style="color:#56ABE8">!weather set temperature:15</span>, replacing the 15 with your own value. If you need more help, just use <span style="color:#56ABE8">"!weather help"</span> to see the help menu.',
    };
    s.install.code = secureString;
    // Waiting on Confirmation ? Handle confirmation : Check what to do at each stage;
    if (s.install.tmp || s.install.tmp === 0) {
      if (input === 'accept') {
        s.install[stage] = s.install.tmp;
        s.install.tmp = null;
        s.install.stageIndex += 1;
        stage = s.install.stageList[s.install.stageIndex];
        if (stage) {
          printTo('gm', reply[stage]);
        } else {
          s.biome = s.install.biome;
          s.seasonSeed = s.install.season.id;
          s.daySeed = s.install.day;
          s.install.needed = false;
          s.install.code = null;
          const stats = {
            temperature: getValueChange(getSeasonTrend('temperature', 0), s.biome.temperature.variance),
            windSpeed: getValueChange(getSeasonTrend('windSpeed', 0), s.biome.windSpeed.variance),
            humidity: getValueChange(getSeasonTrend('humidity', 0), s.biome.humidity.variance),
            precipitation: getValueChange(getSeasonTrend('precipitation', 0), s.biome.precipitation.variance),
          };
          addToDatabase(new Forecast(normalizeForecastStats(stats), 0));
          printTo('gm', reply.finished);
        }
      } else { // input === 'decline';
        s.install.tmp = null;
        printTo('gm', reply[stage]);
      } // End of if(WAITING ON CONFIRMATION);
    } else {
      switch (stage) {
        case 'biome':
        case 'season': {
          if (_.find(s.database[stage], item => item.name === input)) {
            s.install.tmp = _.find(s.database[stage], item => item.name === input);
            printTo('gm', reply.confirmation);
          } else {
            printTo('gm', reply[stage]);
          }
          break;
        }
        case 'day': {
          if (parseFloat(input).toString() === input) {
            s.install.tmp = parseFloat(input);
            printTo('gm', reply.confirmation);
          } else {
            printTo('gm', reply[stage]);
          }
          break;
        }
        default: {
          log('Weather -- Something went horribly wrong. Resetting installation.');
          state.Weather.install = new InstallObj();
        }
      }
    }
  };

// Handles all pausing, and changing of timestamps.
  const handlePause = function (input) {
    const s = state.Weather;
    if (input === s.pause.active) {
      printTo('gm', `Weather is ${s.pause.active ? 'already' : 'not currently'} paused.`);
      return;
    }
    if (input) {
      s.pause.start = Date.now();
      printTo('gm', 'Weather has been paused. You will only be able to retrieve the last weather effect until the resume command is received.');
    } else {
      s.pause.delay += Date.now() - s.pause.start;
      s.pause.start = null;
      printTo('gm', 'Weather has resumed. You can now advance days and get updates again.');
    }
    s.pause.active = !s.pause.active;
  };

// This function mimics a Quartile Function. IT IS MAGIC.
  const normalInverse = function (percentile, mean, deviation) {
  // Taken from: https://gist.github.com/kmpm/1211922/
    if ([percentile, mean, deviation].find(arg => _.isNaN(arg))) {
      throw new Error('An input is not a number');
    } else if (deviation < 0 || percentile < 0) {
      throw new Error('Negative inputs not allowed');
    } else if (percentile >= 1 || percentile <= 0) {
      return percentile > 0 ? Infinity : -Infinity;
    } else if (deviation === 0 || percentile === 0.5) {
      return mean;
    }
    const q = percentile - 0.5;
    if (Math.abs(q) <= 0.425) {
      const r = 0.180625 - q * q;
      return mean + deviation * q *
        (((((((r * 2509.0809287301226727 + 33430.575583588128105) *
        r + 67265.770927008700853) * r + 45921.953931549871457) *
        r + 13731.693765509461125) * r + 1971.5909503065514427) *
        r + 133.14166789178437745) * r + 3.387132872796366608) /
        (((((((r * 5226.495278852854561 + 28729.085735721942674) *
        r + 39307.89580009271061) * r + 21213.794301586595867) *
        r + 5394.1960214247511077) * r + 687.1870074920579083) *
        r + 42.313330701600911252) * r + 1);
    }
    let r = q < 0 ? percentile : 1 - percentile;
    r = Math.sqrt(-Math.log(r));
    if (r <= 5) {
      r -= 1.6;
      return mean + deviation * (q < 0.0 ? -1 : 1) *
        (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) *
        r + 0.24178072517745061177) * r + 1.27045825245236838258) *
        r + 3.64784832476320460504) * r + 5.7694972214606914055) *
        r + 4.6303378461565452959) * r + 1.42343711074968357734) /
        (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) *
        r + 0.0151986665636164571966) * r + 0.14810397642748007459) *
        r + 0.68976733498510000455) * r + 1.6763848301838038494) *
        r + 2.05319162663775882187) * r + 1);
    }
    r -= 5;
    return mean + deviation * (q < 0.0 ? -1 : 1) *
      (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) *
      r + 0.0012426609473880784386) * r + 0.026532189526576123093) *
      r + 0.29656057182850489123) * r + 1.7848265399172913358) *
      r + 5.4637849111641143699) * r + 6.6579046435011037772) /
      (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) *
      r + 1.8463183175100546818e-5) * r + 7.868691311456132591e-4) *
      r + 0.0148753612908506148525) * r + 0.13692988092273580531) *
      r + 0.59983220655588793769) * r + 1);
  };

  const resetState = function () {
    state.Weather = new StateObj();
    log('Weather -- State has been reset!');
  };

// Register event handlers
  const registerEventHandlers = function () {
    on('chat:message', handleChatError);
  };

// Exposed functions
  return {
    CheckInstall: (state.Weather && !state.Weather.install.needed),
    Startup: startup,
    RegisterEventHandlers: registerEventHandlers,
    Advance: apiAdvanceWeather,
    GetLatest: apiGetLastForecast,
    GetUpdate: apiGetUpdatedForecast,
    Get: apiGetSpecificForecast,
  };
}());

on('ready', () => {
  "use strict";

  Weather.Startup();
  Weather.RegisterEventHandlers();
});
