import cors = require("cors")
import express = require("express")
import createGameRouter = require("./routes")

const app = express()
const PORT = Number(process.env.PORT || 3000)

app.use(cors())
app.use(express.json())
app.use(createGameRouter())

app.get("/", (_req, res) => {
  res.send("Server is running")
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
