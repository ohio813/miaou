"use strict";
// Record durations of measured operations and gives stats
// on !!perfs command
//
// To record an operation do
// 	let benchOperation = bench.start("some name");
// 	... do the thing here, might be asynchronous and even recursive
// 	benchOperation.end();
//
// all timings here are in microseconds

const	process = require("process"),
	startTime = Date.now(),
	benchs = new Map;

exports.configure = function(_miaou){
	return this;
}

// The exported Accumulator makes it possible to iteratively compute
// mean, variance and standard deviation on big populations without
// keeping them in memory.
// It's based on the Wedford algorithm:
//  https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Online_algorithm
class Accumulator{
	constructor(name){
		this.name = name;
		this.n = 0; // number of completed operations
		this.mean = 0;
		this.m2 = 0;
		this.sum = 0;
	}
	add(micros){
		this.n++;
		var delta = micros - this.mean;
		this.mean += delta / this.n;
		this.m2 += delta*(micros - this.mean);
		this.sum += micros;
	}
	avg(){
		return this.mean;
	}
	sampleVariance(){
		return this.m2/(this.n-1);
	}
	populationVariance(){
		return this.m2/this.n;
	}
	stdDev(){
		return Math.sqrt(this.m2/this.n);
	}
}

class BenchOperation{
	constructor(bench){
		this.bench = bench;
		this.starthrtime = process.hrtime();
	}
	end(){
		var	diff = process.hrtime(this.starthrtime),
			micros = diff[0]*1e6 + diff[1]/1e3;
		this.bench.add(micros);
		return micros;
	}
}

exports.dump = function(){
	console.log("======= BENCH DUMP =======");
	for (var bench of benchs.values()) {
		console.log(bench.name, " : n:", bench.n, "avg:", bench.avg(), "µs");
	}
	console.log("==========================");
}

exports.start = function(name){
	var bench = benchs.get(name);
	if (!bench) benchs.set(name, bench = new Accumulator(name));
	return new BenchOperation(bench);
}

function fmt(num, prec){
	if (!num) return ' ';
	if (num<100) return num.toPrecision(prec||2);
	return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
}

function fmtDuration(t){
	var d = t/86400000|0;
	return (d ? d+"d ":"")+(new Date(t-d|0)).toUTCString().replace(/.*(\d{2}):(\d{2}):(\d{2}).*/, "$1h $2m $3s");
}

function doCommand(ct){
	var c = "Miaou Server started on " + Date(startTime) + "\n";
	c += "Uptime: " + fmtDuration((Date.now()-startTime))+ "\n";
	c += "Operation Durations:\n";
	c += "Type | Operations | Average (ms) | Std Dev (ms) | Sum (s)\n";
	c += ":-|:-:|:-:|:-:|:-:\n";
	c += Array.from(benchs.values())
	.filter(b => b.n > 2)
	.sort((a, b) =>
		a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
	)
	.map(b =>
		b.name + "|"
		+ b.n  + "|"
		+ fmt(b.avg()/1e3) + "|"
		+ fmt(b.stdDev()/1e3) + "|"
		+ (Math.round(b.sum/1e6) || ' ')
	)
	.join("\n");
	ct.reply(c);
}

exports.registerCommands = function(registerCommand){
	registerCommand({
		name:'perfs',
		fun:doCommand,
		help:"Usage : `!!perfs` lists performance information on some miaou internals",
	});
}

exports.Accumulator = Accumulator;
