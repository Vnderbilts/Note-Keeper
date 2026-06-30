// ============================================================
// TugasKu — To-Do List dengan Persistensi AsyncStorage
// Misi 12: Build a Persistent App
// ============================================================
// LEVEL 1 (WAJIB):
//   - CREATE  : tambah todo via TextInput (validasi input kosong)
//   - READ    : load data saat app dibuka (useEffect)
//   - DELETE  : hapus item (filter + sync ke storage)
//   - AsyncStorage: JSON.stringify/parse setiap data berubah
//   - FlatList + keyExtractor
//   - Empty state (ListEmptyComponent)
//   - Persistensi terbukti (data tetap ada setelah app ditutup)
//
// LEVEL 2 (pilih minimal 2 — di app ini ada 5):
//   1) UPDATE      -> toggle status selesai + edit teks
//   2) DARK MODE   -> tema tersimpan di key terpisah
//   3) SEARCH      -> filter array di memori
//   4) STATISTIK   -> counter total/selesai disimpan & dimuat
//   5) KONFIRMASI HAPUS -> Alert sebelum hapus
//   + HAPUS SEMUA  -> bersihkan key item saja
//
// LEVEL 3 (bonus):
//   - Timestamp tiap item
//   - Sorting (terbaru / abjad / status selesai)
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Storage Keys (terpisah sesuai rubrik) ----------
const KEY_TODOS = '@tugasku:todos';
const KEY_THEME = '@tugasku:theme';
const KEY_STATS = '@tugasku:stats';

// ---------- Helper: generate id sederhana ----------
const generateId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// ---------- Tema ----------
const lightTheme = {
  background: '#F5F6FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtext: '#6B7280',
  border: '#E5E7EB',
  primary: '#4F46E5',
  danger: '#DC2626',
  done: '#9CA3AF',
  inputBg: '#FFFFFF',
};

const darkTheme = {
  background: '#121214',
  card: '#1E1E22',
  text: '#F3F4F6',
  subtext: '#9CA3AF',
  border: '#2D2D33',
  primary: '#818CF8',
  danger: '#F87171',
  done: '#6B7280',
  inputBg: '#1E1E22',
};

export default function App() {
  // ---------- State ----------
  const [todos, setTodos] = useState([]);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [sortMode, setSortMode] = useState('terbaru'); // terbaru | abjad | selesai
  const [stats, setStats] = useState({ totalCreated: 0, totalCompleted: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;

  // ============================================================
  // READ — Muat semua data tersimpan saat app dibuka
  // ============================================================
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [todosRaw, themeRaw, statsRaw] = await Promise.all([
          AsyncStorage.getItem(KEY_TODOS),
          AsyncStorage.getItem(KEY_THEME),
          AsyncStorage.getItem(KEY_STATS),
        ]);

        if (todosRaw !== null) {
          setTodos(JSON.parse(todosRaw));
        }
        if (themeRaw !== null) {
          setIsDark(JSON.parse(themeRaw));
        }
        if (statsRaw !== null) {
          setStats(JSON.parse(statsRaw));
        }
      } catch (err) {
        console.log('Gagal memuat data:', err);
        Alert.alert('Error', 'Gagal memuat data tersimpan.');
      } finally {
        setIsLoaded(true);
      }
    };
    loadAllData();
  }, []);

  // ============================================================
  // Helper sinkronisasi: SELALU kirim array BARU, bukan state lama
  // (setState itu async, jadi jangan andalkan `todos` langsung
  // setelah memanggil setTodos di baris yang sama)
  // ============================================================
  const persistTodos = useCallback(async (newTodos) => {
    setTodos(newTodos);
    try {
      await AsyncStorage.setItem(KEY_TODOS, JSON.stringify(newTodos));
    } catch (err) {
      console.log('Gagal menyimpan todos:', err);
      Alert.alert('Error', 'Gagal menyimpan data.');
    }
  }, []);

  const persistStats = useCallback(async (newStats) => {
    setStats(newStats);
    try {
      await AsyncStorage.setItem(KEY_STATS, JSON.stringify(newStats));
    } catch (err) {
      console.log('Gagal menyimpan statistik:', err);
    }
  }, []);

  const persistTheme = useCallback(async (newIsDark) => {
    setIsDark(newIsDark);
    try {
      await AsyncStorage.setItem(KEY_THEME, JSON.stringify(newIsDark));
    } catch (err) {
      console.log('Gagal menyimpan tema:', err);
    }
  }, []);

  // ============================================================
  // CREATE — tambah todo baru (validasi: tolak input kosong)
  // ============================================================
  const handleAddTodo = async () => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0) {
      Alert.alert('Input Kosong', 'Tulis dulu tugasnya sebelum ditambahkan ya.');
      return;
    }

    const newTodo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      createdAt: new Date().toISOString(), // bonus: timestamp
    };

    const newTodos = [newTodo, ...todos];
    await persistTodos(newTodos);
    setInputText('');

    // update statistik tersimpan
    const newStats = {
      ...stats,
      totalCreated: stats.totalCreated + 1,
    };
    await persistStats(newStats);
  };

  // ============================================================
  // UPDATE (Level 2) — toggle status selesai
  // ============================================================
  const handleToggleComplete = async (id) => {
    let completedDelta = 0;
    const newTodos = todos.map((item) => {
      if (item.id === id) {
        const updated = { ...item, completed: !item.completed };
        completedDelta = updated.completed ? 1 : -1;
        return updated;
      }
      return item;
    });
    await persistTodos(newTodos);

    const newStats = {
      ...stats,
      totalCompleted: Math.max(0, stats.totalCompleted + completedDelta),
    };
    await persistStats(newStats);
  };

  // ============================================================
  // UPDATE (Level 2) — edit teks todo
  // ============================================================
  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEditing = async () => {
    const trimmed = editingText.trim();
    if (trimmed.length === 0) {
      Alert.alert('Input Kosong', 'Teks tugas tidak boleh kosong.');
      return;
    }
    const newTodos = todos.map((item) =>
      item.id === editingId ? { ...item, text: trimmed } : item
    );
    await persistTodos(newTodos);
    cancelEditing();
  };

  // ============================================================
  // DELETE — hapus 1 item, dengan Konfirmasi (Level 2)
  // ============================================================
  const handleDeleteTodo = (id) => {
    Alert.alert(
      'Hapus Tugas?',
      'Tugas yang dihapus tidak bisa dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const newTodos = todos.filter((item) => item.id !== id);
            await persistTodos(newTodos);
          },
        },
      ]
    );
  };

  // ============================================================
  // HAPUS SEMUA (Level 2) — bersihkan key item saja, bukan clear total
  // ============================================================
  const handleDeleteAll = () => {
    if (todos.length === 0) return;
    Alert.alert(
      'Hapus Semua Tugas?',
      `${todos.length} tugas akan dihapus permanen.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(KEY_TODOS); // hanya key todos
            setTodos([]);
          },
        },
      ]
    );
  };

  // ============================================================
  // DARK MODE (Level 2) — toggle & simpan
  // ============================================================
  const toggleDarkMode = () => {
    persistTheme(!isDark);
  };

  // ============================================================
  // SEARCH (Level 2) + SORTING (Level 3 bonus) — di memori, tidak disimpan
  // ============================================================
  const visibleTodos = useMemo(() => {
    let result = [...todos];

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => item.text.toLowerCase().includes(q));
    }

    if (sortMode === 'abjad') {
      result.sort((a, b) => a.text.localeCompare(b.text));
    } else if (sortMode === 'selesai') {
      result.sort((a, b) => Number(a.completed) - Number(b.completed));
    } else {
      // terbaru (default): berdasarkan createdAt desc
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [todos, searchQuery, sortMode]);

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // ---------- Render 1 item todo ----------
  const renderItem = ({ item }) => {
    const isEditing = editingId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { color: theme.text, borderColor: theme.primary }]}
              value={editingText}
              onChangeText={setEditingText}
              autoFocus
              onSubmitEditing={saveEditing}
            />
            <TouchableOpacity onPress={saveEditing} style={styles.iconBtn}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Simpan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelEditing} style={styles.iconBtn}>
              <Text style={{ color: theme.subtext }}>Batal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Pressable
              style={styles.todoRow}
              onPress={() => handleToggleComplete(item.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: item.completed ? theme.done : theme.primary,
                    backgroundColor: item.completed ? theme.done : 'transparent',
                  },
                ]}
              >
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.todoText,
                    { color: item.completed ? theme.subtext : theme.text },
                    item.completed && styles.todoTextDone,
                  ]}
                >
                  {item.text}
                </Text>
                <Text style={[styles.timestamp, { color: theme.subtext }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </Pressable>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => startEditing(item)} style={styles.iconBtn}>
                <Text style={{ color: theme.primary }}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTodo(item.id)} style={styles.iconBtn}>
                <Text style={{ color: theme.danger }}>🗑️ Hapus</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, textAlign: 'center', marginTop: 40 }}>
          Memuat data...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>📝 TugasKu</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            {stats.totalCompleted}/{stats.totalCreated} tugas selesai sepanjang waktu
          </Text>
        </View>
        <TouchableOpacity onPress={toggleDarkMode} style={styles.themeBtn}>
          <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Input tambah tugas */}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Tambah tugas baru..."
          placeholderTextColor={theme.subtext}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleAddTodo}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={handleAddTodo}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
        ]}
        placeholder="🔎 Cari tugas..."
        placeholderTextColor={theme.subtext}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Sort + Hapus Semua */}
      <View style={styles.toolRow}>
        <View style={styles.sortGroup}>
          {['terbaru', 'abjad', 'selesai'].map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setSortMode(mode)}
              style={[
                styles.sortChip,
                {
                  borderColor: theme.border,
                  backgroundColor: sortMode === mode ? theme.primary : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  color: sortMode === mode ? '#FFFFFF' : theme.subtext,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {todos.length > 0 && (
          <TouchableOpacity onPress={handleDeleteAll}>
            <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '600' }}>
              Hapus Semua
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daftar tugas */}
      <FlatList
        data={visibleTodos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          visibleTodos.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              {todos.length === 0
                ? 'Belum ada tugas. Tambahkan satu di atas!'
                : 'Tidak ada tugas yang cocok dengan pencarian.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  themeBtn: {
    padding: 8,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: -2,
  },
  searchInput: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  sortGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  todoText: {
    fontSize: 15,
    lineHeight: 20,
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
  },
  iconBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
});