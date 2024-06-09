const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const QRCode = require('qrcode');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "project-web",
});

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

connection.connect();

app.get("/", (req, res) => {
  connection.connect();
  console.log("TEST");
  connection.query("SELECT 1 + 1 AS solution", (err, rows, fields) => {
    if (err) throw err;

    console.log("The solution is: ", rows[0].solution);
    res.status(200).send(`The solution is: ${rows[0].solution}`);
  });
  connection.end();
});

app.get("/jadwal-ruangan", (req, res) => {
  try {
    connection.query(
      "SELECT * FROM pinjam_ruangan pr JOIN ruangan r ON pr.ruangan_id = r.id WHERE pr.tanggal >= CURDATE() AND MONTH(pr.tanggal) <= (SELECT MONTH(CURDATE())+1) ORDER BY pr.tanggal ASC, pr.jam_awal",
      (err, rows, fields) => {
        if (err) throw err;

        res.status(200).send(rows);
      }
    );
  } catch (error) {
    console.log(error);
  }
});

app.get("/list-ruangan", (req, res) => {
  try {
    connection.query("SELECT * FROM ruangan", (err, results) => {
      let retData = [];
      results.forEach((data) => {
        retData.push({
          name: data.nama_ruangan,
          code: data.kode_ruangan,
        });
      });
      // Close the connection
      res.status(200).send(retData);
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/pinjam-ruangan", (req, res) => {
  try {
    let tanggalPinjam = req.body.tanggalPinjam; // 'YYYY-MM-DD'
    let jam_awal = req.body.jamMulai; // 'HH:MM:SS'
    let jam_akhir = req.body.jamSelesai; // 'HH:MM:SS'
    let peminjam = req.body.namaPeminjam;
    let organisasi = req.body.namaOrganisasi;
    let ruangan = req.body.ruangan.code;
    let keperluan = req.body.keperluan;

    const query1 = `
        SELECT * FROM pinjam_ruangan pr JOIN ruangan r
        WHERE (r.kode_ruangan = ? AND pr.tanggal = ?)
        AND ((jam_awal < ? AND jam_akhir > ?) OR (jam_awal < ? AND jam_akhir > ?))
    `;

    connection.query(
      query1,
      [ruangan, tanggalPinjam, jam_akhir, jam_awal, jam_akhir, jam_awal],
      (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
          res
            .status(400)
            .send("Room is already booked for the requested time slot.");
        } else {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          let bookingCode = "";
          for (let i = 0; i < 30; i++) {
            bookingCode += characters.charAt(
              Math.floor(Math.random() * characters.length)
            );
          }
          QRCode.toDataURL(bookingCode, function (err, url) {
            if (err) throw err;
            console.log('QR Code URL:', url);
          });

          const query = `INSERT INTO pinjam_ruangan SET tanggal = ?, jam_awal = ?, jam_akhir = ?, peminjam =? , organisasi = ?, ruangan_id = (SELECT id FROM ruangan WHERE kode_ruangan = ?), keperluan = ?, booking_code = ?`;
          connection.query(
            query,
            [
              tanggalPinjam,
              jam_awal,
              jam_akhir,
              peminjam,
              organisasi,
              ruangan,
              keperluan,
              bookingCode,
            ],
            (err, rows, fields) => {
              if (err) throw err;

              res.status(200).send(`Data Posted`);
            }
          );
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
