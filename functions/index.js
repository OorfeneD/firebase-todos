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
exports.updateTodo = functions.https.onRequest(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const bodyData = JSON.parse(req.body)
    const user = await verifyUser(bodyData.token)
    const ref = admin.firestore().collection('todos').doc(bodyData.todoId)
    console.dir(ref)
    try {
      await admin.firestore().runTransaction(async t => {
        const doc = await t.get(ref)
        if (doc.data().user_id !== user.uid) {
          throw(new Error('No access'))
        } else {
          await t.update(ref, { status: bodyData.status })
        }
      })
      res.json({ result: `update done` });
    } catch (error) {
      throw (error)
    }
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

exports.getTodos = functions.https.onRequest(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const bodyData = JSON.parse(req.body)
    const user = await verifyUser(bodyData.token)
    const snapshot = await admin.firestore().collection('todos').where('user_id', '==', user.uid).get()
    const data = []
    snapshot.forEach(doc => {
      const docData = doc.data()
      data.push({
        id: doc.id,
        content: docData.content,
        status: docData.status
      })
    })
    if (data.length > 0) {
      res.json({ result: `${data.length} items finded and returned`, data });
    } else {
      res.json({ result: `No data for specified user finded`, data: [] });
    }
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

exports.deleteTodo = functions.https.onRequest(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const bodyData = JSON.parse(req.body)
    const user = await verifyUser(bodyData.token)
    const ref = admin.firestore().collection('todos').doc(bodyData.todoId)
    console.dir(ref)
    try {
      await admin.firestore().runTransaction(async t => {
        const doc = await t.get(ref)
        if (doc.data().user_id !== user.uid) {
          throw(new Error('No access'))
        } else {
          await t.delete(ref)
        }
      })
      res.json({ result: `deletion done` });
    } catch (error) {
      throw (error)
    }
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