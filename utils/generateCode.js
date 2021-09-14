const generateCode = (value) => {
    const splitString = value.split("-").map(el => el.trim())
    const code = splitString[0][0] + "." + splitString[1].substr(0,2) + splitString[1][Math.floor(splitString[1].length / 2)] + splitString[1].substr(-2)
    return code.toUpperCase()
}

module.exports = generateCode