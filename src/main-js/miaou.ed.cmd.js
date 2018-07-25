// functions related to command name and command arguments autocompletion in the input
miaou(function(ed, chat){

	var	commandArgAutocompleters = new Map; // map commandName -> (argStart, previousTokens)=>possibleValues

	function unnest(o){
		return Array.isArray(o) ? unnest(o[0]) : o;
	}

	function arrayToMatcher(arr){
		var unnested0 = arr.map(unnest);
		return function(ac){
			if (!ac.previous) return unnested0;
			for (var i=arr.length; i--;) {
				if (unnested0[i]!==ac.previous) continue;
				if (!Array.isArray(arr[i]) || arr[i].length<2) return;
				return arr[i][1];
			}
		};
	}

	// register either a function or an array describing how arguments of
	//  this command can be autocompleted
	ed.registerCommandArgAutocompleter = function(commandName, matcher){
		if (Array.isArray(matcher)) { // if not we assume it's a function
			matcher = arrayToMatcher(matcher);
		}
		commandArgAutocompleters.set(commandName, matcher);
	}

	// returns the currently autocompletable typed command, if any
	function getaccmd(input){
		var m = input.value.slice(0, input.selectionEnd).match(/(?:^|\s)!!!?(\w+)$/);
		if (m) return m[1].toLowerCase();
	}

	// returns the parts needed for command arg autocompletion:
	// {
	//    cmd: the commandName
	//    previous: what's between the command name and the currently typed argument (no newline)
	//    arg: start of the currently typed command argument
	// }
	ed.getacarg = function(input){
		var m = input.value.slice(0, input.selectionEnd).match(/(?:^|\W)!{2,3}(\w+)\s+(.*)$/);
		if (!m) return;
		var matcher = commandArgAutocompleters.get(m[1]);
		if (!matcher) return;
		var	tokens = m[2].split(/\s+/),
			ac = { cmd:m[1], matcher, args: m[2] };
		ac.arg = tokens.pop();
		ac.previous = tokens.pop();
		return ac;
	}

	ed.tryAutocompleteCmdName = function(input, setMatches){
		var accmd = getaccmd(input);
		if (!accmd) return;
		var matches = Object.keys(chat.commands).sort();
		setMatches(accmd, matches, true);
		return true;
	}

	ed.tryAutocompleteCmdArg = function(input, setMatches){
		var acarg = ed.getacarg(input);
		if (!acarg) return;
		var ret = acarg.matcher(acarg);
		if (!ret) return;
		if (Array.isArray(ret)) {
			ret = {
				matches: ret,
				replaced: acarg.arg,
				mustCheck: true
			};
		}
		setMatches(ret.replaced, ret.matches, ret.mustCheck);
		return true;
	}


});
