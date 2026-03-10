import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { Buyer, mockChatMessages, ChatMessage } from "./MockMarketData";

interface BidDetailScreenProps {
  buyer: Buyer;
  onBack: () => void;
}

export const BidDetailScreen: React.FC<BidDetailScreenProps> = ({
  buyer,
  onBack,
}) => {
  const [showChat, setShowChat] = useState(false);

  const renderChatMessage = (message: ChatMessage, index: number) => {
    const isBuyer = message.sender === "buyer";
    return (
      <View
        key={index}
        style={[
          styles.chatMessageContainer,
          isBuyer ? styles.buyerMessageContainer : styles.farmerMessageContainer,
        ]}
      >
        <View
          style={[
            styles.chatBubble,
            isBuyer ? styles.buyerBubble : styles.farmerBubble,
          ]}
        >
          <Text style={[styles.chatText, isBuyer ? styles.buyerChatText : {}]}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  if (showChat) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setShowChat(false)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>Negotiation Chat</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Chat Messages */}
        <FlatList
          data={mockChatMessages}
          renderItem={({ item, index }) => renderChatMessage(item, index)}
          keyExtractor={(_, index) => index.toString()}
          style={styles.chatList}
          contentContainerStyle={styles.chatContentContainer}
        />

        {/* Chat Footer Message */}
        <View style={styles.chatFooter}>
          <Text style={styles.chatFooterText}>
            This is a demonstration of future chat capabilities.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bid Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Buyer Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>
              {buyer.buyerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.buyerTitle}>{buyer.buyerName}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>⭐ {buyer.rating}</Text>
          </View>
        </View>

        {/* Bid Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bid Details</Text>
          <View style={styles.detailBox}>
            <DetailRow label="Crop" value={buyer.crop} />
            <View style={styles.divider} />
            <DetailRow label="Required Quantity" value={buyer.quantity} />
            <View style={styles.divider} />
            <DetailRow label="Offered Price" value={buyer.price} highlight />
          </View>
        </View>

        {/* Logistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup & Logistics</Text>
          <View style={styles.detailBox}>
            <DetailRow
              label="Pickup Location"
              value={buyer.pickupLocation || "To be confirmed"}
            />
            <View style={styles.divider} />
            <DetailRow
              label="Expected Pickup Date"
              value={buyer.expectedPickupDate || "Flexible"}
            />
          </View>
        </View>

        {/* Buyer Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyer's Message</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              "{buyer.message || 'No message provided'}"
            </Text>
          </View>
        </View>

        {/* Contact Button */}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => setShowChat(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.contactButtonText}>Start Negotiation Chat</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text
      style={[
        styles.detailValue,
        highlight && styles.detailValueHighlight,
      ]}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B5E20",
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B5E20",
  },
  content: {
    flex: 1,
    paddingTop: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#66BB6A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarTextLarge: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  buyerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B5E20",
    marginBottom: 8,
  },
  ratingBadge: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  ratingBadgeText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B5E20",
    marginLeft: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailBox: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  detailValueHighlight: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  messageBox: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#66BB6A",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
    fontStyle: "italic",
  },
  contactButton: {
    backgroundColor: "#2E7D32",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
  // Chat styles
  chatList: {
    flex: 1,
  },
  chatContentContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatMessageContainer: {
    marginVertical: 6,
    flexDirection: "row",
  },
  buyerMessageContainer: {
    justifyContent: "flex-start",
  },
  farmerMessageContainer: {
    justifyContent: "flex-end",
  },
  chatBubble: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  buyerBubble: {
    backgroundColor: "#E8F5E9",
    borderTopLeftRadius: 0,
  },
  farmerBubble: {
    backgroundColor: "#2E7D32",
    borderTopRightRadius: 0,
  },
  chatText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
  },
  buyerChatText: {
    color: "#1B5E20",
  },
  chatFooter: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  chatFooterText: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    fontStyle: "italic",
  },
});
