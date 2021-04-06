
/** Checks if a subcomponent is a direct value (string, name, number) */
function isDirectValue(subcomponent) {
    let direct_values = [
        SubComponentType.STRING,
        SubComponentType.NAME,
        SubComponentType.NUMBER
    ];

    for(let direct_value of direct_values)
        if(subcomponent[0].isOf(direct_value))
            return true;

    return false;
}

function isVariable(subcomponent) {
    if(subcomponent[0].isOf(SubComponentType.NAME)) {
        let constants = ["true", "false", "null"];
        if(!constants.includes(subcomponent[1])) return true;
    }

    return false;
}

function getDirectValue(subcomponent) {


    if(subcomponent[0].isOf(SubComponentType.STRING))

        return new DirectValue(DirectValueType.STRING, subcomponent[1], subcomponent[2][0]);


    else if(subcomponent[0].isOf(SubComponentType.NUMBER))

        return new DirectValue(DirectValueType.NUMBER, Number(subcomponent[1]), subcomponent[2][0]);


    else if(subcomponent[0].isOf(SubComponentType.NAME)) {
        let name = subcomponent[1];
        
        if(name==="true") 
            return new DirectValue(DirectValueType.BOOL, true, subcomponent[2][0]);

        if(name==="false") 
            return new DirectValue(DirectValueType.BOOL, false, subcomponent[2][0]);

        if(name==="null")
            return new DirectValue(DirectValueType.NULL, null, subcomponent[2][0]);

        else return new DirectValue(DirectValueType.VARIABLE, name, subcomponent[2][0]);
    }

}