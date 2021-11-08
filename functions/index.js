const functions = require("firebase-functions");
const admin = require("firebase-admin");
// const { verifyUser } = require("./service/user");
admin.initializeApp();

const verifyUser = async (token) => {
  const result = {}
  if (token === undefined ) {
    result.statusCode = 400
    result.response = {result: "Error", error: "User token required"}
    throw (result)
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    console.dir(decoded)
    const user = await admin.auth().getUser(decoded.user_id)
    if (!user) {
      result.statusCode = 401
      result.response = {result: "Error", error: "Unautorized"}
      throw (result)
    }
    return user
  } catch (error) {
    if (error.code === 'auth/id-token-revoked') {
      throw (new Error (''))
    }
  }
}

exports.addTodo = functions.https.onRequest(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const bodyData = JSON.parse(req.body)
    const user = await verifyUser(bodyData.token)
    const writeResult = await admin.firestore().collection('todos').add({
      content: {
        title: bodyData.title,
      },
      status: false,
      created: Date.now(),
      user_id: user.uid
    });
    console.dir(writeResult)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json({result: `Message with ID: ${writeResult.id} added.`, data: { id: writeResult.id }});
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode).json(error.response)
    }
    else {
      console.error(error)
      res.sendStatus(500)
    }
  }
});
