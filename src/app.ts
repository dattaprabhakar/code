import app from './api';

const PORT = 4770;
let serverIP = "localhost"

app.get("/", async (req, res) => {
    res.send("Third Party API accessed..")
})

app.listen(PORT, (err, res) => {
    console.log("port listen http://" + serverIP + ":" + PORT)
});