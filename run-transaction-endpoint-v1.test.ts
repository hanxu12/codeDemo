import http from "http";
import { AddressInfo } from "net";

import test, { Test } from "tape-promise/tape";
//import { v4 as uuidv4 } from "uuid";

import bodyParser from "body-parser";
import express from "express";

import {
  Containers,
  //IrohaTestLedger,
  pruneDockerAllIfGithubAction,
  PostgresTestContainer,
  IrohaTestLedger,
} from "@hyperledger/cactus-test-tooling";
//import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  //IListenOptions,
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
 import {
//   //PluginLedgerConnectorIroha,
   DefaultApi as IrohaApi,
   RunTransactionRequest,
 } from "../../../main/typescript/public-api";
 import { Configuration } from "../../../../../cactus-core-api/dist/types/main/typescript";

//import { IPluginLedgerConnectorIrohaOptions } from "../../../main/typescript/plugin-ledger-connector-iroha";
//import { DiscoveryOptions } from "iroha-network";
//import { Configuration } from "@hyperledger/cactus-core-api";

/**
 * Use this to debug issues with the Iroha node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */
import * as grpc from "grpc";
import { CommandService_v1Client as CommandService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import commands from "iroha-helpers-ts/lib/commands/index";

const testCase = "runs tx on an Iroha v1.2.0 ledger";
const logLevel: LogLevelDesc = "TRACE";


test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const postgres = new PostgresTestContainer({
    containerImageName: "postgres",
    containerImageVersion: "9.5-alpine",
    postgresPort: 5432,
    envVars: ["POSTGRES_USER=postgres", "POSTGRES_PASSWORD=mysecretpassword"],
  });

  const iroha = new IrohaTestLedger({
    containerImageVersion: "1.20a",
    containerImageName: "hanxyz/iroha",
    rpcToriiPort: 50051,
    logLevel: "TRACE",
    envVars: [
      "IROHA_POSTGRES_HOST=postgres_1",
      "IROHA_POSTGRES_PORT=5432",
      "IROHA_POSTGRES_USER=postgres",
      "IROHA_POSTGRES_PASSWORD=mysecretpassword",
      "KEY=node0",
    ],
  });

  // test the transaction

  // const tearDownPostgres = async () => {
  //   await postgres.stop();
  //   await postgres.destroy();
  // };

  // const tearDownIroha = async () => {
  //   await iroha.stop();
  //   await iroha.destroy();
  // };
  //tear down Iroha first
  // test.onFinish(tearDownIroha);
  // test.onFinish(tearDownPostgres);
  //start postgres first
  await postgres.start();
  await iroha.start();

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    test.onFinish(async () => await Servers.shutdown(server));
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    t.comment(
      `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-iroha/get-prometheus-exporter-metrics`,
    );
    const apiConfig = new Configuration({ basePath: apiHost });
    const apiClient = new IrohaApi(apiConfig);

    {
      const req: RunTransactionRequest = {
        commandName: "createAccount",
        //accountName, domainName, pubkey
        params: [
          "alice",
          "test",
          "716fe505f69f18511a1b083915aa9ff73ef36e6688199f3959750db38b8f4bfc",
        ],
      };

      const res = await apiClient.runTransactionV1(req);
      console.log(res);
      // t.ok(res);
      // t.ok(res.data);
      // t.equal(res.status, 200);
    }
  t.end();
});

// test("AFTER " + testCase, async (t: Test) => {
//   const pruning = pruneDockerAllIfGithubAction({ logLevel });
//   await t.doesNotReject(pruning, "Pruning didn't throw OK");
//   t.end();
// });
