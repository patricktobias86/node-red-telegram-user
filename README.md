# Node-RED nodes to communicate with TeleProto

<p align="center">
<img alt="GitHub issues" src="https://img.shields.io/github/issues/patricktobias86/node-red-telegram-user?color=56BEB8" />
<img alt="GitHub forks" src="https://img.shields.io/github/forks/patricktobias86/node-red-telegram-user?color=56BEB8" />
<img alt="GitHub stars" src="https://img.shields.io/github/stars/patricktobias86/node-red-telegram-user?color=56BEB8" />
</p>

```bash
npm i @patricktobias86/node-red-telegram-user
```

This package contains a collection of Node‑RED nodes built on top of [TeleProto](https://www.npmjs.com/package/teleproto) and the [Node-RED DXP toolkit](https://www.npmjs.com/package/@keload/node-red-dxp). They make it easier to interact with the Telegram MTProto API from your flows.

Node.js 20 or newer is required.

## Node overview

Available nodes:

| Node | Description |
| --- | --- |
| **config** | Stores API credentials and caches sessions for reuse. |
| **auth** | Interactive login that outputs a `stringSession` (also set on `msg.stringSession`). |
| **receiver** | Emits incoming Telegram messages using Raw MTProto updates, with ignore lists, type filters, media limits, and optional edit filtering. Cleans up listeners on close. |
| **command** | Triggers when an incoming message matches a command or regular expression. Cleans up listeners on close. |
| **send-message** | Sends text or media messages with rich options. |
| **send-files** | Uploads one or more files with captions and buttons. |
| **get-entity** | Resolves usernames, IDs, or t.me links into Telegram entities. |
| **delete-message** | Deletes one or more messages, optionally revoking them, and forwards the input message with the API response. |
| **iter-dialogs** | Iterates over dialogs such as chats, groups, and channels. |
| **iter-messages** | Iterates over messages in a chat with filtering options. |
| **promote-admin** | Promotes a user to admin with configurable rights. |
| **resolve-userid** | Converts a username to a numeric user ID. |
| **resolve-peer** | Resolves a Telegram reference into an entity and usable MTProto input peer. |
| **edit-message** | Edits text, formatting, media, or buttons on a peer-scoped message. |
| **forward-messages** | Forwards peer-scoped messages to another peer or forum topic. |
| **download-media** | Downloads media from a Telegram message or media object to a Buffer or file. |
| **react-message** | Adds or removes Unicode and custom emoji reactions. |
| **pin-message** | Pins, unpins, or clears pinned messages within a peer or topic. |
| **mark-read** | Marks messages, mentions, and reactions read. |
| **participants** | Lists visible participants with channel participant filters. |
| **member-management** | Invites, kicks, bans, restricts, promotes, or demotes members. |
| **forum-topic** | Lists, creates, edits, closes, pins, or deletes forum topics. |
| **message-events** | Emits selected non-message raw update categories. |

All nodes preserve any properties on the incoming message outside of <code>msg.payload</code>.

All nodes include a <code>Debug</code> option that logs incoming and outgoing messages to the Node-RED log when enabled.

## Session management

Connections to Telegram are cached by the configuration node. A Map keyed by the `stringSession` tracks each client together with a reference count and the connection promise. If a node is created while another one is still connecting, it waits for that promise and then reuses the same client.

API hashes and session strings are stored as Node-RED credentials. Treat exported sessions, login codes, and 2FA passwords as secrets and never send them through debug nodes.
Existing configurations remain loadable; open and save them once to migrate legacy plain flow properties into credential storage.

Telegram user and channel IDs may require an access hash. Use usernames, entities received from Telegram, or references already known to the session. The nodes do not invent missing access hashes or translate Bot API `-100...` IDs into guaranteed MTProto peers.

Telegram permissions, privacy rules, participant visibility, membership state, and dynamic flood limits still apply. The package does not bypass them. TeleProto owns MTProto update synchronization and gap recovery; `message-events` projects updates dispatched by that synchronized client.

A single `TelegramClient` instance is therefore shared between all flows that point to the same configuration node, even after a redeploy. When Node‑RED restarts it checks the cache and returns the existing client rather than creating a new connection. The reference count is decreased whenever a node using the session is closed. Once all nodes have closed and the count reaches zero, the cached client is disconnected.

## Example flows

Import these JSON files through **Node-RED → Menu → Import**, open the included **Telegram User Account (configure me)** node, and add your API ID, API hash, and string session. Replace placeholder peers and message IDs before deploying.

| Example | Nodes demonstrated |
| --- | --- |
| [User authentication](examples/Example%20User%20Auth.json) | `auth` |
| [Peer and message actions](examples/Peer%20and%20Message%20Actions.json) | `resolve-peer`, `edit-message`, `forward-messages`, `react-message`, `pin-message`, `mark-read` |
| [Participants and member management](examples/Participants%20and%20Member%20Management.json) | `participants`, `member-management` |
| [Forum topics and message events](examples/Forum%20Topics%20and%20Message%20Events.json) | `forum-topic`, `message-events` |

Examples use placeholder usernames and IDs and do not contain Telegram credentials. Member and topic actions affect real chats when triggered, so review each Inject node before use.

## Running tests

After cloning the repository, install dependencies and run the test suite with:

```bash
npm install
npm test
```

The tests use Mocha and verify that sessions are properly cached across nodes.

Editor scripts use `@keload/node-red-dxp` and are bundled into the Node-RED HTML files before tests. Rebuild them directly with:

```bash
npm run build:editors
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.
