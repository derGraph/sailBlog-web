export function removeSensitiveData(inputData: object[]|object){
    if(Array.isArray(inputData)){
        for(let element in inputData){
            inputData[element] = removeSensitiveData(inputData[element]);
        }
    }else{
    
        for(let key in inputData){
            if(inputData[key] == null){
                inputData[key] = null;
            }else{
                if(typeof(inputData[key]) == "object"){
                    if(key == "lastPing"){
                        inputData[key] = null;
                    }
                    inputData[key] = removeSensitiveData(inputData[key]);
                    continue;
                }
                if(key == "email"){
                    inputData[key] = null;
                }
                if(key == "dateOfBirth"){
                    inputData[key] = null;
                }
                if(key == "roleId"){
                    inputData[key] = null;
                }
                if(key == "activeTripId"){
                    inputData[key] = null;
                }
            }
        }
    }        
    return inputData
}