// import React, { useState } from 'react';
// import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, KeyboardAvoidingView, Platform } from 'react-native';
// import { MaterialCommunityIcons  } from '@expo/vector-icons';

// export default function AddInvestmentModal({ visible, onClose, onSave }) {
//   const [nome, setNome] = useState('');
//   const [instituicao, setInstituicao] = useState('');
//   const [valorInicial, setValorInicial] = useState('');
//   const [temMeta, setTemMeta] = useState(false);
//   const [meta, setMeta] = useState('');

//   const handleSave = () => {
//     if (!nome || !valorInicial) {
//       alert('Preencha pelo menos o nome e o valor inicial.');
//       return;
//     }
//     onSave({
//       nome,
//       instituicao,
//       valorAtual: parseFloat(valorInicial) || 0,
//       meta: temMeta ? (parseFloat(meta) || 0) : 0,
//     });
//     // Limpar campos
//     setNome('');
//     setInstituicao('');
//     setValorInicial('');
//     setMeta('');
//     setTemMeta(false);
//   };

//   return (
//     <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
//       <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
//         <View style={styles.modalContainer}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Novo Investimento</Text>
//             <TouchableOpacity onPress={onClose}><MaterialCommunityIcons  name="close" size={28} color="#BBBBBB" /></TouchableOpacity>
//           </View>
          
//           <Text style={styles.label}>Nome do Investimento</Text>
//           <TextInput style={styles.input} placeholder="Ex: Reserva de Emergência" placeholderTextColor="#666" value={nome} onChangeText={setNome} />
          
//           <Text style={styles.label}>Instituição (Opcional)</Text>
//           <TextInput style={styles.input} placeholder="Ex: Nubank, XP, etc." placeholderTextColor="#666" value={instituicao} onChangeText={setInstituicao} />
          
//           <Text style={styles.label}>Valor Inicial</Text>
//           <TextInput style={styles.input} placeholder="R$ 0,00" placeholderTextColor="#666" keyboardType="numeric" value={valorInicial} onChangeText={setValorInicial} />
          
//           <View style={styles.switchContainer}>
//             <Text style={styles.label}>Definir uma meta?</Text>
//             <Switch value={temMeta} onValueChange={setTemMeta} trackColor={{false: '#333', true: '#2196F3'}} thumbColor={'#f4f3f4'} />
//           </View>

//           {temMeta && (
//             <>
//               <Text style={styles.label}>Valor da Meta</Text>
//               <TextInput style={styles.input} placeholder="R$ 10.000,00" placeholderTextColor="#666" keyboardType="numeric" value={meta} onChangeText={setMeta} />
//             </>
//           )}

//           <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
//             <Text style={styles.saveButtonText}>Salvar Investimento</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//     modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
//     modalContainer: { width: '90%', backgroundColor: '#1E1E1E', borderRadius: 15, padding: 20 },
//     modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
//     modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
//     label: { color: '#BBBBBB', fontSize: 14, marginBottom: 8, marginTop: 12 },
//     input: { backgroundColor: '#333333', color: '#FFFFFF', borderRadius: 8, padding: 12, fontSize: 16 },
//     switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
//     saveButton: { backgroundColor: '#2196F3', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
//     saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
// });
