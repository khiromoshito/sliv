

function processFlag(flag_subcomponent) {
    let flag_name = flag_subcomponent[1];

    if(FLAGS[flag_name]===undefined) 
        throw(`CompileException: Unknown flag '${flag_name}' at `+
            `line ${flag_subcomponent[2][0].line} `+
            `column ${flag_subcomponent[2][0].column}`);

    let flag = new FlagItem();
    flag.name = flag_name;
    flag.start = flag_subcomponent[2][0];
    flag.end = flag_subcomponent[2][1];

    return flag;
}
