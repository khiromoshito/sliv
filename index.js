#!/usr/bin/env node


const yargs = require("yargs");
const fs = require("fs");
const colors = require("colors");

let f1 = fs.readFileSync('./compiler/init.js')+"";
let f2 = fs.readFileSync('./compiler/lexer1.js')+"";
let f3 = fs.readFileSync('./compiler/lexer2.js')+"";
let f4 = fs.readFileSync('./compiler/evaluator.js')+"";

eval(f1+f2+f3+f4);

const options = yargs.option("r", {
    alias: "path",
    describe: "Execute file from given path",
    type: "string",
    demandOption: true
}).argv;

let path = options.path;
console.log(`Executing sliv file from path '${path}'...`);
console.log(`---------------------------------`);
console.log(`\n\n`);

fs.readFile(path, 'utf-8', function(err, source){
    if(err) {
        console.log(err);
    } else {

        console.time("\n\nPROCESS TIME");
        interpret(source, path);
        console.timeEnd("\n\nPROCESS TIME");

    }
});
