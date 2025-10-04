// import React from 'react';
// import { View, Text, Image } from 'react-native';
// import { PieChart } from 'react-native-svg-charts';
// import { globalStyles } from '../styles/globalStyles';
// import { colors } from '../styles/colors';

// // Avatares locais - nomes em minúsculas para consistência
// const memberAvatars = {
//   rafael: require('../../assets/Rafael.png'),
//   kézzia: require('../../assets/Kézzia.png'),
// };

// const DonutEntradas = ({ incomes = [], members = [] }) => {
//   // Calcular total de entradas
// const total = incomes
//   .filter(income => income.pago === true)
//   .reduce((acc, income) => acc + income.valor, 0);

//   // Calcular contribuição de cada membro
//   const membersWithContributions = members.map(member => {
// const memberIncomes = incomes.filter(
//   income => income.membro === member.name && income.pago === true
// );
//     const memberTotal = memberIncomes.reduce((acc, income) => acc + income.valor, 0);
//     const percentage = total > 0 ? (memberTotal / total) * 100 : 0;
    
//     return {
//       ...member,
//       totalAmount: memberTotal,
//       percentage: percentage,
//       incomes: memberIncomes
//     };
//   }).filter(member => member.totalAmount > 0); // Só mostrar membros com contribuições

//   // Preparar dados para o PieChart - cores baseadas na imagem de inspiração
//   const chartColors = [
//     '#4ECDC4', // Verde água (35%)
//     '#45B7D1', // Azul claro (25%)  
//     '#96CEB4', // Verde claro (15%)
//     '#FFEAA7', // Amarelo claro (10%)
//     '#DDA0DD', // Roxo claro (7%)
//     '#74B9FF'  // Azul médio
//   ];

//   const donutData = membersWithContributions.map((member, index) => ({
//     key: member.name,
//     value: member.totalAmount,
//     svg: { fill: chartColors[index % chartColors.length] },
//     member: member
//   }));

//   // Função para calcular posição dos avatares ao redor do donut
//   const getAvatarPosition = (index, percentage, cumulativePercentage, radius = 85) => {
//     // Calcular o ângulo baseado na posição do centro do segmento
//     const segmentCenter = cumulativePercentage + (percentage / 2);
//     const angle = (360 * segmentCenter / 100) - 90; // -90 para começar no topo
//     const radian = (angle * Math.PI) / 180;
//     return {
//       x: Math.cos(radian) * radius,
//       y: Math.sin(radian) * radius,
//       angle: angle
//     };
//   };

//   if (total === 0) {
//     return (
//       <View style={[globalStyles.centerContent, { height: 200 }]}>
//         <Text style={globalStyles.noDataText}>Nenhuma entrada encontrada</Text>
//       </View>
//     );
//   }

//   return (
//     <View>
//       {/* Donut Chart */}
//       <View style={{ 
//         position: 'relative', 
//         alignItems: 'center', 
//         justifyContent: 'center',
//         height: 250,
//         marginBottom: 20
//       }}>
//         <PieChart 
//           style={{ height: 200, width: 200 }} 
//           data={donutData} 
//           innerRadius={50} 
//           padAngle={0.02}
//         />
        
//         {/* Avatares dos membros posicionados ao redor do donut */}
//         {membersWithContributions.map((member, index) => {
//           // Calcular percentual cumulativo para posicionamento correto
//           const cumulativePercentage = membersWithContributions
//             .slice(0, index)
//             .reduce((acc, m) => acc + m.percentage, 0);
          
//           const position = getAvatarPosition(index, member.percentage, cumulativePercentage);
//           const memberNameLower = member.name.toLowerCase();
//           const avatarSource = memberAvatars[memberNameLower] || require('../../assets/default.png');
          
//           return (
//             <View
//               key={member.name}
//               style={{
//                 position: 'absolute',
//                 left: 125 + position.x - 25, // 125 é metade da largura do container, 25 é metade do avatar
//                 top: 125 + position.y - 25,  // 125 é metade da altura do container, 25 é metade do avatar
//                 alignItems: 'center',
//               }}
//             >
//               <View style={{
//                 alignItems: 'center',
//                 justifyContent: 'center'
//               }}>
//                 <Image 
//                   source={avatarSource}
//                   style={{
//                     width: 50,
//                     height: 50,
//                     borderRadius: 25,
//                     borderWidth: 3,
//                     borderColor: 'white',
//                     backgroundColor: 'white'
//                   }} 
//                 />
//                 <View style={{
//                   backgroundColor: chartColors[index % chartColors.length],
//                   borderRadius: 10,
//                   paddingHorizontal: 8,
//                   paddingVertical: 3,
//                   marginTop: 5,
//                   minWidth: 35,
//                   alignItems: 'center'
//                 }}>
//                   <Text style={{ 
//                     fontSize: 12, 
//                     fontWeight: 'bold',
//                     color: 'white'
//                   }}>
//                     {member.percentage.toFixed(0)}%
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           );
//         })}

//         {/* Nome do membro principal no centro (maior contribuição) */}
//         {membersWithContributions.length > 0 && (
//           <View style={{
//             position: 'absolute',
//             alignItems: 'center',
//             justifyContent: 'center',
//             backgroundColor: 'white',
//             borderRadius: 30,
//             width: 60,
//             height: 60,
//             borderWidth: 2,
//             borderColor: '#f0f0f0'
//           }}>
//             <Image 
//               source={memberAvatars[membersWithContributions[0].name.toLowerCase()] || require('../../assets/default.png')}
//               style={{
//                 width: 40,
//                 height: 40,
//                 borderRadius: 20,
//               }} 
//             />
//             <Text style={{
//               position: 'absolute',
//               bottom: -25,
//               fontSize: 16,
//               fontWeight: 'bold',
//               color: colors.textPrimary
//             }}>
//               {membersWithContributions[0].name}
//             </Text>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// };

// export default DonutEntradas;