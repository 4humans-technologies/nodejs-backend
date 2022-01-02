/* create one document at a time */

module.exports = (req, res, next) => {
  /**
   * assumptions:
   * 1 - req will contain populated user object
   * 2 - permissions are in role or not will be checked over database each time
   * 3 -
   *
   */

  /**
   * check for permission of creating
   */

  const { resource } = req.params

  switch (resource) {
    case "Model":
      /**
       * create new model
       */
      
      break
    case "Viewer":
      /**
       * create new viewer
       */
      break
    case "Tag":
      break
    case "Approval":
      break
    case "Role":
      /**
       *
       */
      break
    case "Coupon":
      /**
       * can put check on the max "coin value" generation
       */
      break
    default:
      break
  }
}
