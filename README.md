![test](https://github.com/twin-te/course-service/workflows/test/badge.svg)

# twinte-course-service
時間割アプリ Twin:te - https://app.twinte.net のv3バックエンドの一部です。

kdbから講義情報の取得と管理を行います。

# 利用方法
[ビルド済みDockerImage](https://github.com/orgs/twin-te/packages?repo_name=course-service)が利用できます。

| 環境変数名  | 説明                             | default               |
|------------|----------------------------------|-----------------------|
| PGHOST     | Postgres接続先のホスト名         | postgres              |
| PGPORT     | Postgres接続先のポート番号       | 5432                  |
| PGDATABASE | Postgres接続先のデータベース名   | twinte_course_service |
| PGUSER     | Postgres接続に使用するユーザー名 | postgres              |
| PGPASSWORD | Postgres接続に使用するパスワード | postgres              |

# 開発方法
Docker + VSCodeを推奨します。
以下その方法を紹介します。

1. [RemoteDevelopment](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)拡張機能をインストール
2. このプロジェクトのフォルダを開く
3. 右下に `Folder contains a Dev Container configuration file. Reopen folder to develop in a container` と案内が表示されるので`Reopen in Container`を選択する。（表示されない場合はコマンドパレットを開き`open folder in container`と入力する）
4. node14の開発用コンテナが立ち上がりVSCodeで開かれます。また、別途postgresも立ち上がり利用できるようになります。
5. `yarn install` で依存をインストールします。
6. `yarn proto` でgrpcに必要なファイルを生成します（開発中にprotoを変更した際も実行してください）
7. `yarn dev` で立ち上がります。

また、`yarn test` でテストを実行、`yarn build` でビルドできます。

`yarn client`を実行するとcliでgrpcリクエストを送れる[grpcc](https://github.com/njpatel/grpcc)が利用できます。

# v3バックエンドサービス一覧
 - API Gateway
 - Auth Callback
 - User Service
 - Session Service
 - Timetable Service
 - Course Service (here)
 - Search Service
 - Donation Service
 - School Calendar Service
 - Information Service
 - Task Service