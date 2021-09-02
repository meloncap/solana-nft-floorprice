import Table from "../../components/table/Table";
import Time from "../../components/currentTime/CurrentTime";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { GrUpdate } from "react-icons/gr";
import Spinner from "../../components/spinner/Spinner";
import { useRouter } from "next/router";
import TitleWelcome from "../../components/common/TitleWelcome";
import InfoTwoHours from "../../components/common/InfoTwoHours";
import DonContainer from "../../components/donation/DonContainer";
import LinkHome from "../../components/common/LinkHome";


const Styles = styled.div`
  display: flex;
  .table-container{
    margin-right: 8rem;
    @media (max-width: 981px) {
      margin-right: 1rem;
  }
  }
  .pagination-div {
    display: flex;
    position: relative;
    top:1rem;
  
    left: 2rem;
  }
  .pagination-pages {
    display: block;
    right: 4rem;
    & > span >input{
      width:2rem;
    }
    & > select {
      width: 6rem; 
    }
  }

  .pagination-buttons {
    height: 1rem;
    display: block;
    left: 8rem;
    bottom: 1rem;
    font-size: 1.2rem;
  }
  table {
    border-spacing: 0;
    border: 1px solid #c4c4c4;
    margin-left: 2rem;
    margin-top: 2.2rem;
    margin-bottom: 1rem;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid #c4c4c4;
      border-right: 1px solid #c4c4c4;

      :last-child {
        border-right: 0;
      }
    }
  }
`;
// fetch data from server, send id to query in mongo
async function getFloorPrices(id) {
  const res = await fetch(
    `${
      window.origin == "http://localhost:3000"
        ? "http://localhost:8080"
        : "https://nft-nextjs.herokuapp.com"
    }/load`,
    {
      headers: {
        id,
      },
    }
  );
  //
  let { data } = await res.json();
  console.log("data",data)


  const digitalEyesData = data.filter((e) => e.marketplace === "digitaleyes");

  const solanartData = data.filter((e) => e.marketplace === "solanart");

  return {
    digitalEyesData,
    solanartData,
  };
}

function Data() {
  //enviamos el id de la href "/fetch/xxxx"
  const router = useRouter();

  const columns = (title) => {
    return [
      {
        Header: title,
        columns: [
          {
            Header: "Floor Price",
            accessor: "floorprice", //key in data
          },
          {
            Header: "Time",
            accessor: "time",
          },
        ],
      },
    ];
  };

  // setData modifica valor de data
  const [{ solanartData, digitalEyesData }, setData] = useState({
    solanartData: [],
    digitalEyesData: [],
  });
  const [loading, setLoading] = useState(false);

  // quan es renderitza el  hook o pateix canvis
  useEffect(() => {
    getFloorPrices(router.query.id).then((data) => {
      
      setData(data);
    });
  }, [router.query]);

  function updateData() {
    setLoading(true);
    getFloorPrices(router.query.id).then((data) => {
      setLoading(false);
      setData(data);
      
    });
  }

  const collectionNames = {
    solanadogesnfts: "SolanaDoges",
    thugbirdz: "Thugbirdz",
    degenapes: "Degen Ape Academy",
    abstratica: "Abstratica",
    solpops: "Solpops",
    soliens: "Soliens",
    soldalas: "Soldalas",
    solanimals: "Solanimals",
    pixelpenguin: "PixelPenguins",
    frakt: "Frakt",
    solchihuahua: "SolChihuahua",
    smb: "SMB",
    solbear: "SolBear",
    solarians: "Solarians",
    boldbadgers:"Boldbadgers",
    "sollamas-gen2": "Sollamas",
    tophatchicks:"TopHatChicks",
    solpunks: "Solpunks"
  };

  return (
    <div>
      <LinkHome />
      <TitleWelcome />
      <h3>
        {" "}
        <div>
          Here you can track the history of Floor Price for{" "}
          <b>{collectionNames[router.query.id]} </b>
        </div>
      </h3>
      <DonContainer />
      <InfoTwoHours />
      <Time />
      <div style={{ display: "flex", marginBottom: "0rem", height: "2rem" }}>
        <button onClick={updateData}>
          <GrUpdate /> Update
        </button>
        {loading && <Spinner />}
      </div>

      <Styles>
        {digitalEyesData.length > 1 && (
          <Table columns={columns("DigitalEyes")} data={digitalEyesData} />
        )}
        {solanartData.length > 1 && (
          <Table columns={columns("Solanart")} data={solanartData} />
        )}
      </Styles>
    </div>
  );
}
export default Data;
