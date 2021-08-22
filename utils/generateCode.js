const generateCode = (value) => {
    const splitString = value.split("-").map(el => el.trim())
    const code = splitString[0][0] + "." + splitString[1].substr(0, 2)
    return code.toUpperCase()
}

module.exports = generateCode