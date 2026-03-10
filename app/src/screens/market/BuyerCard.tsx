import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { Buyer } from "./MockMarketData";

interface BuyerCardProps {
  buyer: Buyer;
  onViewBid: (buyer: Buyer) => void;
}

export const BuyerCard: React.FC<BuyerCardProps> = ({ buyer, onViewBid }) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <View style={styles.card}>
      {/* Header with Buyer Avatar and Name */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(buyer.buyerName)}</Text>
        </View>
        <View style={styles.buyerInfo}>
          <Text style={styles.buyerName}>{buyer.buyerName}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {buyer.rating}</Text>
          </View>
        </View>
      </View>

      {/* Crop and Quantity Section */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Looking for:</Text>
          <Text style={styles.value}>{buyer.crop}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Quantity:</Text>
          <Text style={styles.value}>{buyer.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{buyer.location}</Text>
        </View>
      </View>

      {/* Price Highlight Section */}
      <View style={styles.priceSection}>
        <Text style={styles.priceLabel}>Offered Price</Text>
        <Text style={styles.priceValue}>{buyer.price}</Text>
      </View>

      {/* View Bid Button */}
      <TouchableOpacity
        style={styles.viewBidButton}
        onPress={() => onViewBid(buyer)}
        activeOpacity={0.8}
      >
        <Text style={styles.viewBidButtonText}>View Bid</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#66BB6A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B5E20",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 13,
    color: "#558B2F",
    fontWeight: "500",
  },
  detailsSection: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  label: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
  },
  value: {
    fontSize: 13,
    color: "#333333",
    fontWeight: "600",
  },
  priceSection: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
  },
  priceLabel: {
    fontSize: 12,
    color: "#558B2F",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  viewBidButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  viewBidButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
