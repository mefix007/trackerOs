// TrackCircle App with Firebase Integration
// React Native + Firebase + Navigation + Real Location History

import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const Tab = createBottomTabNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>Welcome to TrackCircle</Text>
      <Button title="Go to Map" onPress={() => navigation.navigate('Map')} />
    </View>
  );
}

function MapScreen() {
  const [location, setLocation] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      Geolocation.getCurrentPosition(
        position => {
          const coords = position.coords;
          setLocation(coords);
          firestore().collection('locations').add({
            userId: user.uid,
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp: firestore.FieldValue.serverTimestamp(),
          });
        },
        error => console.warn(error.message),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    }
  }, [user]);

  return location ? (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
    </MapView>
  ) : (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Fetching location...</Text>
    </View>
  );
}

function HistoryScreen() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      const unsubscribe = firestore()
        .collection('locations')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLocations(data);
        });
      return () => unsubscribe();
    }
  }, []);

  return (
    <FlatList
      style={{ flex: 1, padding: 20 }}
      data={locations}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 15 }}>
          <Text>📍 {item.latitude}, {item.longitude}</Text>
          <Text>🕒 {item.timestamp?.toDate().toLocaleString() || 'Loading...'}</Text>
        </View>
      )}
    />
  );
}

function SettingsScreen() {
  const handleLogout = () => {
    auth().signOut().then(() => Alert.alert('Signed Out'));
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Settings</Text>
      <Button title="Geofence Settings" onPress={() => alert('Geofence settings placeholder')} />
      <Button title="Notifications" onPress={() => alert('Notification settings placeholder')} />
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    auth().onAuthStateChanged(user => {
      if (!user) auth().signInAnonymously();
      setInitialized(true);
    });
  }, []);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading App...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator initialRouteName="Home">
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
