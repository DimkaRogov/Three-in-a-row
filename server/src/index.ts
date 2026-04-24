import cors = require("cors")
import express = require("express")
import routes = require("./routes")

const app = express()
const PORT = Number(process.env.PORT || 3000)

app.use(cors())
app.use(express.json())
app.use(routes)

app.get("/", (_req, res) => {
  res.send("Server is running")
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
