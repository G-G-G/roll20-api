// Github: https://github.com/bpunya/roll20-api/blob/master/BackwaterCampaign/CombatMovement.js
// Author: PaprikaCC (Bodin Punyaprateep)

var CombatMovement = CombatMovement || (function(){

    /* This script is made to track the movement of tokens while the turn order
    ** window is active. Tokens can move as long as they do not exceed the total
    ** movement available to them. Allowed movement is reset at the top of the
    ** turn order.
    **
    ** The TrackingArray.turnorder object holds the allowed movement of each
    ** token in an array. The first number in the array is the remaining movement
    ** and the second number is the token's total movement. This script ignores
    ** all tokens that do not have a character sheet attached. Example below:
    **
    ** TrackingArray.turnorder[0] = {'-Ksdf9234jfs9':[30,30]}
    **
    ** The token with ID '-Ksdf9234jfs9' has 30 units of movement per combat
    ** round. As they move, the first number decrements by the amount they move
    ** until it hits 0. When it hits 0, the script will disallow all movement
    ** until the combat turn finishes.
    */

    var
    version = "1.0",
    lastUpdate = 1475270598,
    TrackingArray = {'turnorder':{},'initialtoken':false},

    Chat_Formatting_START = '<div style="background-color:#ffffff; padding:5px; border-width:2px; border-style:solid;">'+
                            '<div style="border-width:2px; border-style:dotted; padding:5px">',

    Chat_Formatting_END = '</div>'+
                          '</div>';

    // On boot, do this stuff
    checkVersion = function() {
        if(!state.CombatMovement) { state.CombatMovement = {'active':false, 'autoreset':true}; }
        s = state.CombatMovement;
        if(!Campaign().get('initiativepage')) {
            log('Resetting Combat Movement data...')
            clearData();
        }
        log('-- Combat Movement v'+version+' -- ['+(new Date(lastUpdate*1000))+']');
    },

    // When the turnorder page closes, call this function and clear data.
    checkCombatStatus = function() {
        if(!Campaign().get('initiativepage') && s.autoreset) {
            clearData();
        }
    },

    // Call this when we advance the turn order.
    checkCurrentRound = function() {
        if(!s.active) { return; }
        var currentTokenID = JSON.parse(Campaign().get('turnorder'))[0]['id'];
        if(currentTokenID == TrackingArray.initialtoken) {
            for(i=0; i < TrackingArray.turnorder.length; i++) {
                TrackingArray.turnorder[i][0] = TrackingArray.turnorder[i][1]
            }
        }
    },

    changeOptions = function(msg, option) {
        var actionTaken = false;
        switch(option) {
            case 'start':
            if(!s.active && Campaign().get('initiativepage')) {
                s.active = true;
                freezeTurnOrder();
                actionTaken = 'is now ACTIVE';
            }
            break;

            case 'pause':
            if(s.active && Campaign().get('initiativepage')) {
                s.active = false;
                actionTaken = 'has been paused'
            }
            break;

            case 'toggle':
            if(Campaign().get('initiativepage')) {
                s.active = !s.active;
                actionTaken = s.active ? 'is now ACTIVE' : 'has been paused';
            }
            break;

            case 'reset':
            if(TrackingArray['turnorder'].length > 0) {
                clearData();
                s.active = true;
                freezeTurnOrder();
                actionTaken = 'has reset the stored turnorder'
            }
            break;

            case 'stop':
            actionTaken = 'has cleared all stored information';
            clearData();
            break;
        }
        if(actionTaken) {
            output = `${Chat_Formatting_START} Combat Movement ${actionTaken}${Chat_Formatting_END}`
            printToChat(msg, output)
        }
    },

    clearData = function() {
        s.active = false;
        TrackingArray = {'turnorder':{},'initialtoken':false};
    };

    freezeTurnOrder = function() {
        var tokenID, characterID,
        current_turn_order = JSON.parse(Campaign().get('turnorder'));
        if(current_turn_order.length < 1) {
            printToChat({who:'gm'}, "You haven't rolled initiative yet!")
            return;
        }

        // Set initial token
        TrackingArray.initialtoken = current_turn_order[0]['id']

        // Set turnorder and movements
        for(i = 0; i < current_turn_order.length; i++) {
            tokenID = current_turn_order[i]['id'];
            characterID = getObj('graphic', tokenID).get('represents') || false;
            if(characterID) {
                movement = getAttrByName(characterID, 'speed');
                TrackingArray.turnorder[tokenID] = [movement, movement];
            }
        }
    },

    handleChatInput = function(msg) {
        if(!playerIsGM(msg.playerid)) { return; }
        args = msg.content.split(/\s/)
        switch(args[0]) {
            case '!combatmovement':
            case '!CombatMovement':
            case '!CM':

                switch(args[1]) {
                    case '--start':
                    changeOptions(msg, 'start')
                    break;

                    case '--pause':
                    changeOptions(msg, 'pause')
                    break;

                    case '--toggle':
                    changeOptions(msg, 'toggle');
                    break;

                    case '--stop':
                    changeOptions(msg, 'stop');
                    break;

                    case '--reset':
                    changeOptions(msg, 'reset')
                    break;

                    case '--help':
                    showHelp(msg)
                    break;

                    case 'debug':

                        switch(args[2]) {
                            case 'log':
                            log(`Combat Movement v${version}`)
                            log(`Is the script on? ${s.active}.`)
                            log(TrackingArray)
                            break;

                            case 'clear':
                            state.CombatMovement = {'active':false, 'autoreset':true};
                            TrackingArray = {'turnorder':{},'initialtoken':false};
                            break;
                        }
                    break;

                    default:
                    showHelp(msg);
                    break;
                }
        }
    },

    printToChat = function(msg, content) {
        sendChat('Combat Movement', `/w ${msg.who} <br>`+
                content
                );
    },

    showHelp = function(msg) {
        currentState = s.active ? 'ACTIVE' : 'INACTIVE';
        helpContent = Chat_Formatting_START+
                '<h3>Combat Movement help</h3><br>'+
                '<strong>Available Options:</strong><br>'+
                '--start <i>// Begins tracking token movement.</i><br>'+
                '--pause <i>// Disables the script temporarily.</i><br>'+
                '--toggle <i>// Toggles the current state.</i><br>'+
                '--reset <i>// Resets all tracking (Use after a fight)</i><br>'+
                '--stop <i>// Completely clears all tracked data and stops the script</i><br>'+
                '<br>The script is currently <b>' + currentState + '</b>, and will automatically stop when the turn order window is closed.'+
                Chat_Formatting_END;
        printToChat(msg, helpContent);
    };

    handleTokenMovement = function(obj, prev) {
        log(obj.id)
        if( !s.active
           || (!Campaign().get('initiativepage'))
           || (obj.get('represents') == '')
            ) { return; }

        if(TrackingArray.turnorder[obj.id][0] <= 0) {
            obj.set({left: prev.left, top: prev.top, rotation: prev.rotation});
        }
        // check movement
        log(obj.get('left'))
        log(obj.get('top'))
        movementX = (obj.get('left') - prev['left'])/14;
        directionX = movementX > 0 ? 'right' : 'left';
        movementY = (obj.get('top') - prev['top'])/14;
        directionY = movementY > 0 ? 'down' : 'up'
        log(`I moved ${Math.abs(movementX)} feet ${directionX} and ${Math.abs(movementY)} feet ${directionY}.`)
        // Now we figure out how to translate these numbers into a "token moved this distance" number.
        // After that is figured out, just subtract it from TrackingArray.turnorder[obj.id][0] if it's
        // legal. If it's not legal, just shift stuff back.
    },

    registerEventHandlers = function(){
        on('chat:message', handleChatInput);
        on('change:graphic', handleTokenMovement);
        on('change:campaign:turnorder', checkCurrentRound);
        on('change:campaign:initiativepage', checkCombatStatus);
    };

    return {
        CheckVersion: checkVersion,
        RegisterEventHandlers: registerEventHandlers
    };
}());


on('ready', function(){
    'use strict'
    CombatMovement.CheckVersion()
    CombatMovement.RegisterEventHandlers()
    s.active = false;
});