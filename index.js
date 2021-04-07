#!/usr/bin/env node


const yargs = require("yargs");
const fs = require("fs");
const colors = require("colors");
const pathhelper = require("path");


let importables = {
    init: ["const", "contexts", "init"],

    lexer1: ["lex1"],

    lexer2: ["attrs", "command", "direct", 
        "flag", "func", "group", "lex2", 
        "setter", "type", "value"],

    evaluator: ["call", "command", "compare", 
        "crumbs", "direct", "eval", 
        "logic", "native", "operation", 
        "params", "value", "setter", "instance"]
};


let imported = "";

let importable_dirs = Object.keys(importables);
for(let dirname of importable_dirs) {
    for(let bin of importables[dirname]) {
        imported += fs.readFileSync(pathhelper.join(__dirname + `/compiler/${dirname}/${bin}.js`));
    }
}

eval(imported);

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
