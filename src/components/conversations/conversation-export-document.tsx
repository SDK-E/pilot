import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  exportBlocks,
  type ExportMessage,
  type ExportSource,
} from "@/conversations/conversation-export";

import type { ReactElement } from "react";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#172126",
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.55,
    paddingBottom: 52,
    paddingHorizontal: 48,
    paddingTop: 48,
  },
  header: {
    borderBottom: "1 solid #d9e1e3",
    marginBottom: 22,
    paddingBottom: 14,
  },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  subtitle: { color: "#607278", fontSize: 9 },
  message: { marginBottom: 22 },
  role: {
    color: "#5a8a00",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  paragraph: { marginBottom: 7 },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginBottom: 7,
    marginTop: 7,
  },
  sourceBox: {
    backgroundColor: "#f6f8f2",
    border: "1 solid #dde5cc",
    borderRadius: 4,
    marginTop: 10,
    padding: 9,
  },
  sourceTitle: { color: "#4f7a00", fontFamily: "Helvetica-Bold", fontSize: 9 },
  sourceMeta: { color: "#607278", fontSize: 8, marginTop: 2 },
  sourceSummary: { color: "#405157", fontSize: 8, marginTop: 3 },
  footer: {
    bottom: 22,
    color: "#607278",
    fontSize: 8,
    left: 48,
    position: "absolute",
    right: 48,
    textAlign: "center",
  },
});

export function ConversationExportDocument({
  messages,
  sources,
}: {
  messages: ExportMessage[];
  sources: ExportSource[];
}): ReactElement {
  return (
    <Document
      author="Pilot"
      subject="Conversation export"
      title="Pilot conversation"
    >
      <Page size="A4" style={styles.page}>
        <View fixed style={styles.header}>
          <Text style={styles.title}>Pilot conversation</Text>
          <Text style={styles.subtitle}>
            Visible messages and cited sources
          </Text>
        </View>
        {messages.map((message) => (
          <View key={message.id} style={styles.message} wrap>
            <Text style={styles.role}>
              {message.role === "user" ? "You" : "Pilot"}
            </Text>
            {exportBlocks(message.content).map((block, index) => (
              <Text
                key={`${message.id}-${String(index)}`}
                style={block.heading ? styles.heading : styles.paragraph}
              >
                {block.text}
              </Text>
            ))}
            {sources
              .filter((source) => source.messageId === message.id)
              .map((source) => (
                <View key={source.url} style={styles.sourceBox}>
                  <Link src={source.url} style={styles.sourceTitle}>
                    {source.title}
                  </Link>
                  <Text style={styles.sourceMeta}>{source.domain}</Text>
                  <Text style={styles.sourceSummary}>{source.summary}</Text>
                </View>
              ))}
          </View>
        ))}
        <Text
          fixed
          render={({ pageNumber, totalPages }) =>
            `Pilot · ${String(pageNumber)} / ${String(totalPages)}`
          }
          style={styles.footer}
        />
      </Page>
    </Document>
  );
}
