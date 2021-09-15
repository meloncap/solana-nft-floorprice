const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const datafetched = require("../models/datafetched");
const server = express();
const axios = require("axios");
const cron = require("node-cron");


const isDev = process.argv[2] === "--development";

if (isDev) {
  require("dotenv").config({
    path: ".env.development",
  });
} else {
  require("dotenv").config();
}

const connection = {};

const collectionsAddressSolanart = require("./collectionsSolanart");
const collectionsAddressDigitalEyes = require("./collectionsDigitalEyes");
const SOLANART_URL =
"https://ksfclzmasu.medianet.work/nft_for_sale?collection=";
let DIGITALEYES_URL =
"https://us-central1-digitaleyes-prod.cloudfunctions.net/offers-retriever?collection=";


dbConnect();

// Custom options for Cors
const corsOptions = {
  optionsSuccessStatus: 200,
};

server.use(cors(corsOptions));

server.get("/load", async (req, res) => {
  const { id } = req.headers;
  try {
    const data = await datafetched
      .find({
        collectionname: id,
      })
      .sort({
        time: 1,
      });
    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.log("error get", error);
    res.status(400).json({
      success: false,
    });
  }
});

server.get("/loadall", async (req, res) => {
  try {
    let data = [];

    await Promise.all(
      collectionsAddressSolanart.map(async (e) => {
        data.push(
          await datafetched
            .findOne({
              collectionname: e.name,
            })
            .sort({
              time: -1,
            })
        );
      })
    );

    await Promise.all(
      collectionsAddressDigitalEyes.map(async (e) => {
        data.push(
          await datafetched
            .findOne({
              collectionname: e.name,
            })
            .sort({
              time: -1,
            })
        );
      })
    );

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.log("error get", error);
    res.status(400).json({
      success: false,
    });
  }
});

async function saveSolanart() {
  try {
    // save the data in solarianData
    collectionsAddressSolanart.forEach(async function (coll) {
      const { data: solanartData } = await axios(
        `${SOLANART_URL}${coll.collectionName}`
      );

      let floorprice = 999999;
      let priceSum = 0;
      let numberOfOwners = new Set();

      // Save all valid prices
      solanartData
        .filter(
          (e) =>
            Boolean(e.price) &&
            e.id !== 473037 &&
            e.id !== 472737 &&
            e.id !== 576575 &&
            e.id !== 576821 &&
            e.id !== 576368 &&
            e.id !== 576352 &&
            e.id !== 593521
        )
        .forEach((e) => {
          const price = e.price;
          floorprice = price < floorprice ? price : floorprice;
          priceSum += price;
          numberOfOwners.add(e.seller_address);
        });

      // Obtain avrg price
      let dataNfts = {};
      solanartData.forEach(({ seller_address }) => {
        if (!dataNfts[seller_address]) dataNfts[seller_address] = 0;
        dataNfts[seller_address]++;
      });

      let filteredData = {};
      Object.keys(dataNfts).forEach((address) => {
        let seller_address = dataNfts[address];
        if (!filteredData[seller_address]) filteredData[seller_address] = 0;
        filteredData[seller_address]++;
      });

      // Save in DB
      await datafetched.create({
        floorprice: floorprice,
        collectionname: coll.name,
        marketplace: "solanart",
        numberofowners: numberOfOwners.size,
        numberoftokenslisted: solanartData.length,
        numberofnftperowner: filteredData,
        avrgPrice: Math.round((priceSum / solanartData.length) * 100) / 100,
      });
    });

    return;
  } catch (error) {
    console.log("error so", error);
    return error;
  }
}

async function fetchDe(fullData, collUrl, next_cursor) {
  const { data: solarianData } = await axios(
    `${DIGITALEYES_URL}${collUrl}${next_cursor}`
  );
  let floor_price = solarianData.price_floor;

  fullData = [...fullData, ...solarianData.offers];

  if (solarianData.next_cursor) {
    return await fetchDe(
      fullData,
      collUrl,
      `&cursor=${solarianData.next_cursor}`
    );
  } else {
    return {
      fullData,
      floor_price,
    };
  }
}

async function saveDigitalEyes() {
  try {
    // save the data in solarianData
    collectionsAddressDigitalEyes.forEach(async function (coll) {
      const { fullData, floor_price } = await fetchDe([], coll.url, "");

      let priceSum = 0;
      let numberOfOwners = new Set();

      fullData.forEach((e) => {
        const price = e.price / 1000000000;
        priceSum += price;
        numberOfOwners.add(e.owner);
      });
      // for numberofnftperowner-----------------------------
      let dataNfts = {};
      fullData.forEach(({ owner }) => {
        if (!dataNfts[owner]) dataNfts[owner] = 0;
        dataNfts[owner]++;
      });

      let filteredData = {};
      Object.keys(dataNfts).forEach((address) => {
        let owner = dataNfts[address];
        if (!filteredData[owner]) filteredData[owner] = 0;
        filteredData[owner]++;
      });
      //------------------------------------------------

      // Save in DB

      await datafetched.create({
        floorprice: Number(floor_price / 1000000000),
        collectionname: coll.name,
        marketplace: "digitaleyes",
        numberofowners: numberOfOwners.size,
        numberoftokenslisted: fullData.length,
        numberofnftperowner: filteredData,
        avrgPrice: Math.round((priceSum / fullData.length) * 100) / 100,
      });
      console.log("saved");
    });

    return;
  } catch (error) {
    console.log("error de", error);
    return error;
  }
}

server.listen(process.env.PORT || 8080, (err) => {
  if (err) throw err;
  console.log("> Ready on http://localhost:8080");

  // to start
  cron.schedule("0 */1 * * *", () => {
    // cron.schedule("*/30 * * * * *", () => {
    console.log("running a task every hour");
    saveDigitalEyes();
    saveSolanart();
  });
});

async function dbConnect() {
  if (connection.isConnected) {
    return;
  }
  const db = await mongoose.connect(process.env.NEXT_PUBLIC_DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  mongoose.connection.on(
    "error",
    console.error.bind(console, "MongoDB connection error:")
  );
  connection.isConnected = db.connections[0].readyState === 1;
  console.log("Connected to db", connection.isConnected);
}
