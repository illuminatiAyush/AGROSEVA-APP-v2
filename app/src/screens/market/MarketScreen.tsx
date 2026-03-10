import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { buyers, Buyer } from "./MockMarketData";
import { BuyerCard } from "./BuyerCard";
import { BidDetailScreen } from "./BidDetailScreen";

export const MarketScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);

  // Get unique crops for filter chips
  const uniqueCrops = useMemo(() => {
    return Array.from(new Set(buyers.map((b) => b.crop)));
  }, []);

  // Filter buyers based on search and crop selection
  const filteredBuyers = useMemo(() => {
    return buyers.filter((buyer) => {
      const matchesSearch =
        buyer.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCrop = selectedCrop ? buyer.crop === selectedCrop : true;

      return matchesSearch && matchesCrop;
    });
  }, [searchQuery, selectedCrop]);

  if (selectedBuyer) {
    return (
      <BidDetailScreen
        buyer={selectedBuyer}
        onBack={() => setSelectedBuyer(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AgroSeva Market</Text>
          <Text style={styles.headerSubtitle}>
            Connect directly with buyers near you
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search buyers, crops, or locations"
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Crop Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedCrop(null)}
            style={[
              styles.filterChip,
              selectedCrop === null && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCrop === null && styles.filterChipTextActive,
              ]}
            >
              All Crops
            </Text>
          </TouchableOpacity>

          {uniqueCrops.map((crop) => (
            <TouchableOpacity
              key={crop}
              onPress={() => setSelectedCrop(crop)}
              style={[
                styles.filterChip,
                selectedCrop === crop && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCrop === crop && styles.filterChipTextActive,
                ]}
              >
                {crop}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Buyers List */}
      {filteredBuyers.length > 0 ? (
        <FlatList
          data={filteredBuyers}
          renderItem={({ item }) => (
            <BuyerCard buyer={item} onViewBid={setSelectedBuyer} />
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          style={styles.buyersList}
          contentContainerStyle={styles.buyersListContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>No Available Bids</Text>
          <Text style={styles.emptyStateText}>
            Try adjusting your search or filter to find more buyers
          </Text>
        </View>
      )}

      {/* Results Counter */}
      {filteredBuyers.length > 0 && (
        <View style={styles.resultsFooter}>
          <Text style={styles.resultsText}>
            Showing {filteredBuyers.length} of {buyers.length} available bids
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerContent: {
    marginTop: Platform.OS === "ios" ? 8 : 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#E8F5E9",
    fontWeight: "400",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  chipsScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  buyersList: {
    flex: 1,
  },
  buyersListContent: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B5E20",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    lineHeight: 20,
  },
  resultsFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  resultsText: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    fontWeight: "500",
  },
});
