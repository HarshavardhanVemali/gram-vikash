import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Image,
    Dimensions,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { useFarmerStore } from '../store';
import { translations } from '../utils/translations';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// Local image paths (from assets)
const COTTON_IMG = require('../../assets/cotton_item.png');
const WHEAT_IMG = require('../../assets/wheat_item.png');
const SOYBEAN_IMG = require('../../assets/soybean_item.png');

// Indian States & Districts Data
const STATES_DISTRICTS = {
    'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
    'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
    'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Tarn Taran'],
    'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
    'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
    'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
    'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
    'Karnataka': ['Bagalkot', 'Bangalore Rural', 'Bangalore Urban', 'Belagavi', 'Bellary', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
    'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar', 'Jogulamba', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahbubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
};

export default function MarketScreen() {
    const navigation = useNavigation();
    const { language: storedLang } = useFarmerStore();
    const language = storedLang || 'hi';
    const t = translations[language] || translations['hi'];
    useBackHandler();

    const [marketData, setMarketData] = React.useState([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [userLoc, setUserLoc] = React.useState({ district: 'Nagpur', state: 'Maharashtra' });
    const [locationModalVisible, setLocationModalVisible] = React.useState(false);
    const [draftDistrict, setDraftDistrict] = React.useState('');
    const [draftState, setDraftState] = React.useState('');
    const [activeDropdown, setActiveDropdown] = React.useState(null); // 'state' | 'district' | null

    const API_KEY = process.env.EXPO_PUBLIC_AGMARKNET_API_KEY;
    const RESOURCE_ID = '35985678-0d79-46b4-9ed6-6f13308a1d24';

    const hindiCrops = t.crops || {};

    const getCropImage = (commodity) => {
        const c = commodity.toLowerCase();
        if (c.includes('cotton')) return COTTON_IMG;
        if (c.includes('wheat')) return WHEAT_IMG;
        if (c.includes('soya')) return SOYBEAN_IMG;
        return null; // Use emoji placeholder for others
    };

    const getCropEmoji = (commodity) => {
        const c = commodity.toLowerCase();
        if (c.includes('paddy') || c.includes('rice')) return '🌾';
        if (c.includes('maize') || c.includes('corn')) return '🌽';
        if (c.includes('onion')) return '🧅';
        if (c.includes('tomato')) return '🍅';
        if (c.includes('potato')) return '🥔';
        if (c.includes('banana')) return '🍌';
        if (c.includes('mango')) return '🥭';
        if (c.includes('orange') || c.includes('mousambi')) return '🍊';
        if (c.includes('pomegranate')) return '🍎';
        if (c.includes('grapes')) return '🍇';
        if (c.includes('garlic')) return '🧄';
        if (c.includes('ginger')) return '🫚';
        if (c.includes('turmeric') || c.includes('haldi')) return '🟡';
        if (c.includes('chilli') || c.includes('mirch')) return '🌶️';
        if (c.includes('groundnut') || c.includes('peanut')) return '🥜';
        if (c.includes('sunflower')) return '🌻';
        if (c.includes('mustard') || c.includes('sarson')) return '🟤';
        if (c.includes('jowar') || c.includes('sorghum')) return '🌿';
        if (c.includes('bajra')) return '🌿';
        if (c.includes('tur') || c.includes('dal') || c.includes('gram') || c.includes('lentil')) return '🫘';
        return '🌱';
    };

    const getCropColor = (commodity) => {
        const c = commodity.toLowerCase();
        if (c.includes('paddy') || c.includes('rice')) return '#f59e0b';
        if (c.includes('maize')) return '#d97706';
        if (c.includes('onion')) return '#a855f7';
        if (c.includes('tomato')) return '#ef4444';
        if (c.includes('potato')) return '#92400e';
        if (c.includes('banana')) return '#ca8a04';
        if (c.includes('mango')) return '#f97316';
        if (c.includes('chilli')) return '#dc2626';
        if (c.includes('groundnut')) return '#d97706';
        if (c.includes('sunflower')) return '#eab308';
        if (c.includes('tur') || c.includes('dal') || c.includes('gram')) return '#84cc16';
        return '#4a7543';
    };

    React.useEffect(() => {
        const initLocationAndData = async () => {
            setLoading(true);
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                let dist = 'Nagpur';
                let st = 'Maharashtra';

                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    const geo = await Location.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });
                    if (geo.length > 0) {
                        dist = geo[0].district || geo[0].city || 'Nagpur';
                        st = geo[0].region || 'Maharashtra';
                        setUserLoc({ district: dist, state: st });
                    }
                }
                await fetchMarketData(dist, st);
            } catch (err) {
                console.error('Location/Market Error:', err);
                await fetchMarketData('Nagpur', 'Maharashtra');
            }
        };
        initLocationAndData();
    }, []);

    const fetchMarketData = async (dist, st) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=50&filters[state]=${st}&filters[district]=${dist}`
            );
            const data = await response.json();

            if (data.records && data.records.length > 0) {
                // Group by commodity for a cleaner list
                const commodities = {};
                data.records.forEach(r => {
                    const c = r.Commodity.toLowerCase();
                    if (!commodities[c]) {
                        commodities[c] = {
                            name: hindiCrops[c] || r.Commodity,
                            en: r.Commodity,
                            price: `₹${r.Modal_Price}`,
                            mandi: `${r.Market}`,
                            image: getCropImage(r.Commodity),
                            emoji: getCropEmoji(r.Commodity),
                            color: getCropColor(r.Commodity),
                            update: r.Arrival_Date
                        };
                    }
                });
                setMarketData(Object.values(commodities));
            } else {
                setMarketData([]);
            }
            setLoading(false);
        } catch (err) {
            console.error('Agmarknet Fetch Error:', err);
            setError('बाज़ार डेटा लोड करने में विफल');
            setLoading(false);
        }
    };

    const filteredCrops = React.useMemo(() => {
        if (!searchQuery) return marketData;
        const q = searchQuery.toLowerCase();
        return marketData.filter(crop =>
            crop.name.toLowerCase().includes(q) ||
            crop.en.toLowerCase().includes(q)
        );
    }, [searchQuery, marketData]);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />

            {/* Simple Integrated Header */}
            <View style={styles.headerRow}>

                <Text style={styles.screenTitle}>GramBazaar</Text>
                <TouchableOpacity style={styles.infoBtn}>
                    <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
                </TouchableOpacity>
            </View>

            {/* Consolidated Search & Mic Row */}
            <View style={styles.searchMicRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#6b7c5a" style={styles.searchIcon} />
                    <TextInput
                        placeholder="फ़सल खोजें — गेहूँ, कपास..."
                        placeholderTextColor="#9ca3af"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.micBtn}>
                    <Ionicons name="mic" size={22} color="#ffffff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Location-based Attribution — tappable to change */}
                <TouchableOpacity
                    style={styles.locationHeader}
                    onPress={() => {
                        setDraftDistrict(userLoc.district);
                        setDraftState(userLoc.state);
                        setLocationModalVisible(true);
                    }}
                    activeOpacity={0.75}
                >
                    <Ionicons name="location" size={14} color="#4a7543" />
                    <Text style={styles.attribution}>
                        {userLoc.district}, {userLoc.state} • Agmarknet लाइव
                    </Text>
                    <Ionicons name="chevron-down" size={13} color="#4a7543" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                {/* Location Change Modal */}
                <Modal
                    visible={locationModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => { setActiveDropdown(null); setLocationModalVisible(false); }}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => { setActiveDropdown(null); setLocationModalVisible(false); }}
                    >
                        <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>स्थान बदलें</Text>
                            <Text style={styles.modalSubtitle}>राज्य चुनें, फिर जिला चुनें</Text>

                            {/* STATE DROPDOWN */}
                            <Text style={styles.inputLabel}>राज्य (State)</Text>
                            <TouchableOpacity
                                style={[styles.dropdownTrigger, activeDropdown === 'state' && styles.dropdownTriggerActive]}
                                onPress={() => setActiveDropdown(activeDropdown === 'state' ? null : 'state')}
                            >
                                <Text style={draftState ? styles.dropdownValue : styles.dropdownPlaceholder}>
                                    {draftState || 'राज्य चुनें...'}
                                </Text>
                                <Ionicons
                                    name={activeDropdown === 'state' ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color="#4a7543"
                                />
                            </TouchableOpacity>
                            {activeDropdown === 'state' && (
                                <ScrollView style={styles.dropdownList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {Object.keys(STATES_DISTRICTS).map((state) => (
                                        <TouchableOpacity
                                            key={state}
                                            style={[
                                                styles.dropdownItem,
                                                draftState === state && styles.dropdownItemActive
                                            ]}
                                            onPress={() => {
                                                setDraftState(state);
                                                setDraftDistrict('');
                                                setActiveDropdown('district');
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownItemText,
                                                draftState === state && styles.dropdownItemTextActive
                                            ]}>{state}</Text>
                                            {draftState === state && <Ionicons name="checkmark" size={16} color="#4a7543" />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {/* DISTRICT DROPDOWN */}
                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>जिला (District)</Text>
                            <TouchableOpacity
                                style={[
                                    styles.dropdownTrigger,
                                    !draftState && styles.dropdownTriggerDisabled,
                                    activeDropdown === 'district' && styles.dropdownTriggerActive
                                ]}
                                onPress={() => {
                                    if (!draftState) return;
                                    setActiveDropdown(activeDropdown === 'district' ? null : 'district');
                                }}
                            >
                                <Text style={draftDistrict ? styles.dropdownValue : styles.dropdownPlaceholder}>
                                    {draftDistrict || (draftState ? t.selectDistrict : 'पहले राज्य चुनें')}
                                </Text>
                                <Ionicons
                                    name={activeDropdown === 'district' ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={draftState ? '#4a7543' : '#94a3b8'}
                                />
                            </TouchableOpacity>
                            {activeDropdown === 'district' && draftState && (
                                <ScrollView style={styles.dropdownList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {(STATES_DISTRICTS[draftState] || []).map((dist) => (
                                        <TouchableOpacity
                                            key={dist}
                                            style={[
                                                styles.dropdownItem,
                                                draftDistrict === dist && styles.dropdownItemActive
                                            ]}
                                            onPress={() => {
                                                setDraftDistrict(dist);
                                                setActiveDropdown(null);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownItemText,
                                                draftDistrict === dist && styles.dropdownItemTextActive
                                            ]}>{dist}</Text>
                                            {draftDistrict === dist && <Ionicons name="checkmark" size={16} color="#4a7543" />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => { setActiveDropdown(null); setLocationModalVisible(false); }}
                                >
                                    <Text style={styles.cancelText}>{t.modalCancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.confirmBtn,
                                        (!draftDistrict || !draftState) && { opacity: 0.5 }
                                    ]}
                                    onPress={() => {
                                        if (!draftDistrict || !draftState) return;
                                        const newLoc = { district: draftDistrict, state: draftState };
                                        setUserLoc(newLoc);
                                        setActiveDropdown(null);
                                        setLocationModalVisible(false);
                                        fetchMarketData(newLoc.district, newLoc.state);
                                    }}
                                >
                                    <Text style={styles.confirmText}>{t.modalApply}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="sync" size={40} color="#4a7543" style={styles.loadingIcon} />
                        <Text style={styles.loadingText}>आपके क्षेत्र के भाव लोड हो रहे हैं...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="alert-circle" size={40} color="#dc2626" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={() => fetchMarketData(userLoc.district, userLoc.state)} style={styles.retryBtn}>
                            <Text style={styles.retryText}>पुनः प्रयास करें</Text>
                        </TouchableOpacity>
                    </View>
                ) : filteredCrops.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="search-outline" size={40} color="#94a3b8" />
                        <Text style={styles.noResultsTitle}>कोई परिणाम नहीं मिला</Text>
                        <Text style={styles.noResultsSub}>"{searchQuery}" के लिए कोई भाव नहीं मिले।</Text>
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                            <Text style={styles.clearText}>खोज साफ़ करें</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cardsContainer}>
                        {filteredCrops.map((crop, index) => (
                            <TouchableOpacity key={index} style={styles.cropCard} activeOpacity={0.9}>
                                {crop.image ? (
                                    <Image source={crop.image} style={styles.cropImage} />
                                ) : (
                                    <View style={[styles.cropImage, styles.cropPlaceholder, { backgroundColor: `${crop.color}18` }]}>
                                        <Text style={styles.cropPlaceholderEmoji}>{crop.emoji}</Text>
                                    </View>
                                )}

                                <View style={styles.cardContent}>
                                    <View style={styles.cardTop}>
                                        <View>
                                            <Text style={styles.cropName}>{crop.name}</Text>
                                            <Text style={styles.cropEnglish}>{crop.en}</Text>
                                        </View>
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.priceText}>{crop.price}</Text>
                                            <Text style={styles.unitText}>/ क्विंटल</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardBottom}>
                                        <View style={styles.mandiBox}>
                                            <Ionicons name="location-outline" size={12} color="#4a7543" />
                                            <Text style={styles.mandiDetail} numberOfLines={1}>{crop.mandi}</Text>
                                        </View>
                                        {crop.update && (
                                            <Text style={styles.updateText}>{crop.update}</Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#faf7f1',
        paddingTop: 0,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,

        paddingBottom: 15,
    },
    backBtn: {
        padding: 4,
    },
    screenTitle: {
        fontSize: 22,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
    },
    infoBtn: {
        padding: 4,
    },
    searchMicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 15,
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#1a2e0a',
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_400Regular',
    },
    micBtn: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: '#4a7543',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100, // Space for bottom nav
    },
    attribution: {
        fontSize: 12,
        color: '#4a7543',
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        opacity: 0.9,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 15,
        backgroundColor: '#ebf0e6',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'center',
    },
    cardsContainer: {
        paddingHorizontal: 14,
        gap: 12,
    },
    cropCard: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        height: 110,
    },
    cropImage: {
        width: 100,
        height: '100%',
        backgroundColor: '#f8fafc',
    },
    cropPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cropPlaceholderEmoji: {
        fontSize: 40,
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cropName: {
        fontSize: 18,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
    },
    cropEnglish: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: 'DMSans_400Regular',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 18,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
    },
    unitText: {
        fontSize: 10,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_400Regular',
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    changeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    changeText: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
    },
    mandiDetail: {
        fontSize: 11,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_500Medium',
        marginLeft: 4,
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    loadingIcon: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 14,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_400Regular',
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
        fontFamily: 'NotoSansDevanagari_500Medium',
        marginTop: 12,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 20,
        backgroundColor: '#ebf0e6',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d9e2d1',
    },
    retryText: {
        color: '#4a7543',
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        fontSize: 14,
    },
    mandiBox: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    updateText: {
        fontSize: 10,
        color: '#94a3b8',
        fontFamily: 'DMSans_400Regular',
    },
    noResultsTitle: {
        fontSize: 18,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
        marginTop: 16,
    },
    noResultsSub: {
        fontSize: 14,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_400Regular',
        marginTop: 4,
        textAlign: 'center',
    },
    clearBtn: {
        marginTop: 20,
        backgroundColor: '#ebf0e6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
    },
    clearText: {
        color: '#4a7543',
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        fontSize: 14,
    },

    // --- Location Modal ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        backgroundColor: '#faf7f1',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 36,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#d1d5db',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#64748b',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#4a7543',
        marginBottom: 6,
        marginTop: 4,
    },
    // Dropdown trigger
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 4,
    },
    dropdownTriggerActive: {
        borderColor: '#4a7543',
        borderWidth: 1.8,
    },
    dropdownTriggerDisabled: {
        backgroundColor: '#f8fafc',
        opacity: 0.7,
    },
    dropdownValue: {
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: '#1a2e0a',
    },
    dropdownPlaceholder: {
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        color: '#9ca3af',
    },
    // Dropdown list
    dropdownList: {
        maxHeight: 180,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        marginBottom: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    dropdownItemActive: {
        backgroundColor: '#ebf0e6',
    },
    dropdownItemText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: '#1a2e0a',
    },
    dropdownItemTextActive: {
        fontFamily: 'DMSans_600SemiBold',
        color: '#4a7543',
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    cancelText: {
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#64748b',
        fontSize: 15,
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#4a7543',
        alignItems: 'center',
    },
    confirmText: {
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#ffffff',
        fontSize: 15,
    },
});
