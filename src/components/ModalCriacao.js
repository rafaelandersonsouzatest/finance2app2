import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { vibrarSucesso } from '../utils/haptics';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import AlertaModal from './AlertaModal';
import SeletorData from './SeletorData';
import { useCurrencyInput } from '../hooks/useCurrencyInput';

const ModalCriacao = ({
  visivel,
  aoFechar,
  aoSalvar,
  tipo,
  titulo,
  mesSelecionado,
  anoSelecionado,
}) => {
  const [valores, setValores] = useState({});
  const [alerta, setAlerta] = useState({ visivel: false });
  const [modoCalculo, setModoCalculo] = useState(null);
  const {
        texto: valorTexto,
        handleChange: handleValorTextoChange
      } = useCurrencyInput(valores.valor, (n) => handleChange('valor', n));

      const {
        texto: valorTotalTexto,
        handleChange: handleValorTotalTextoChange
      } = useCurrencyInput(valores.valorTotal, (n) => handleChange('valorTotal', n));

      const {
        texto: valorParcelaTexto,
        handleChange: handleValorParcelaTextoChange
      } = useCurrencyInput(valores.valorParcela, (n) => handleChange('valorParcela', n));

      const {
        texto: valorInicialTexto,
        handleChange: handleValorInicialTextoChange
      } = useCurrencyInput(valores.valorInicial, (n) => handleChange('valorInicial', n));

      const {
        texto: metaTexto,
        handleChange: handleMetaTextoChange
      } = useCurrencyInput(valores.meta, (n) => handleChange('meta', n));

useEffect(() => {
  if (!visivel) return;
      handleValorTextoChange(String(valores.valor || ''));
      handleValorTotalTextoChange(String(valores.valorTotal || ''));
      handleValorParcelaTextoChange(String(valores.valorParcela || ''));
      handleValorInicialTextoChange(String(valores.valorInicial || ''));
      handleMetaTextoChange(String(valores.meta || ''));
    }, [visivel]);



  const formatarDataParaExibicao = (data) => {
    if (!data) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(data)) return data;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}-${mes}-${ano}`;
    }
    try {
      const d = new Date(data);
      if (isNaN(d.getTime())) return '';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return String(data);
    }
  };

  const formatarDataParaSalvar = (data) => {
    if (!data) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(data)) return data;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}-${mes}-${ano}`;
    }
    try {
      const d = new Date(data);
      if (isNaN(d.getTime())) return data;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return data;
    }
  };

useEffect(() => {
  if (visivel && !valores?.id) { // só limpa se for novo (sem id)
    setValores(getValoresIniciais());
    setModoCalculo(null);
  }
}, [visivel, tipo]);

  const getValoresIniciais = () => {
    const hoje = new Date();
    const hojeDDMMYYYY = gerarDataComDia(
      hoje.getDate(),
      hoje.getMonth() + 1,
      hoje.getFullYear()
    );

    switch (tipo) {
      case 'entrada':
        return { descricao: '', valor: '', data: formatarDataParaExibicao(hojeDDMMYYYY), categoria: '' };
      case 'gasto':
        return { descricao: '', valor: '', dataVencimento: formatarDataParaExibicao(hojeDDMMYYYY), categoria: '' };
      case 'emprestimo':
        return { descricao: '', valorTotal: '', valorParcela: '',totalParcelas: '', dataInicio: formatarDataParaExibicao(hojeDDMMYYYY), pessoa: '', categoria: '' };
      case 'cartao':
        return { descricao: '', valor: '', valorParcela: '', dataCompra: formatarDataParaExibicao(hojeDDMMYYYY), categoria: '', parcelas: 1, pessoa: '', cartao: '' };
      case 'investimento':
        return { nome: '', valorInicial: '', instituicao: '', meta: '' };
      default:
        return {};
    }
  };

  const handleChange = (campo, valor) =>
    setValores((prev) => ({ ...prev, [campo]: valor }));

  const handleSalvar = () => {
      if (tipo === 'emprestimo' || tipo === 'cartao') {
        const totalParcelas =
          parseInt(valores.totalParcelas || valores.parcelas || 1, 10);

        if (modoCalculo === 'total' && valores.valorTotal && totalParcelas > 0) {
          valores.valorParcela = Number(valores.valorTotal) / totalParcelas;
        } else if (modoCalculo === 'parcela' && valores.valorParcela && totalParcelas > 0) {
          valores.valorTotal = parseFloat(valores.valorParcela) * totalParcelas;
        } else {
          // impede salvar se nenhum modo foi selecionado
          setAlerta({
            visivel: true,
            titulo: 'Selecione um modo de cálculo',
            mensagem: 'Escolha entre "Valor Total" ou "Valor da Parcela" antes de salvar.',
            icone: 'alert-circle-outline',
            corIcone: colors.pending,
            textoBotao: 'Entendi',
          });
          return;
        }
      }

    vibrarSucesso();

    const camposObrigatorios = getCamposObrigatorios();
    const camposFaltando = camposObrigatorios.filter((campo) => !valores[campo]);
    if (camposFaltando.length > 0) {
      setAlerta({
        visivel: true,
        titulo: 'Campos obrigatórios',
        mensagem: `Preencha os seguintes campos:\n${camposFaltando.join(', ')}`,
        icone: 'alert-circle-outline',
        corIcone: colors.expense,
        textoBotao: 'Entendi',
      });
      return;
}


    const valoresProcessados = processarValores(valores);
    const descricaoItem =
      valoresProcessados.descricao || valoresProcessados.nome || '';
    const now = new Date();
    const mesAlvo =
      typeof mesSelecionado === 'number' ? mesSelecionado : now.getMonth() + 1;
    const anoAlvo =
      typeof anoSelecionado === 'number' ? anoSelecionado : now.getFullYear();

    const aplicarDataPadraoSeNecessario = (
      campoData,
      chavePadrao = descricaoItem
    ) => {
      if (!chavePadrao) return;
      const diaPadrao = datasPadraoPorDescricao[chavePadrao];
      if (diaPadrao && !valoresProcessados[campoData]) {
        valoresProcessados[campoData] = gerarDataComDia(diaPadrao, mesAlvo, anoAlvo);
      } else if (valoresProcessados[campoData]) {
        valoresProcessados[campoData] = formatarDataParaSalvar(
          valoresProcessados[campoData]
        );
      }
    };

    if (tipo === 'entrada') aplicarDataPadraoSeNecessario('data');
    else if (tipo === 'gasto') aplicarDataPadraoSeNecessario('dataVencimento');
    else if (tipo === 'emprestimo') aplicarDataPadraoSeNecessario('dataInicio');
    else if (tipo === 'cartao') aplicarDataPadraoSeNecessario('dataCompra');

    aoSalvar(valoresProcessados);
    let mensagem = '';
      switch (tipo) {
        case 'entrada':
          mensagem = `Entrada salva com sucesso!\n${valores.descricao} - R$ ${Number(valores.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nData: ${valores.data || '—'}`;
          break;
        case 'gasto':
          mensagem = `Gasto salvo com sucesso!\n${valores.descricao} - R$ ${Number(valores.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nVencimento: ${valores.dataVencimento || '—'}`;
          break;
        case 'emprestimo':
          mensagem = `Empréstimo registrado!\n${valores.descricao} - ${valores.totalParcelas}x de R$ ${Number(valores.valorParcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nTotal: R$ ${Number(valores.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          break;
        case 'cartao':
          const qtdParcelas = parseInt(valores.totalParcelas || valores.parcelas || 1, 10);
          const valorParcelaNum = parseFloat(valores.valorParcela || 0);
          const valorTotalNum = parseFloat(valores.valorTotal || 0);
          mensagem = `Compra registrada!\n${valores.descricao} - ${qtdParcelas}x de R$ ${valorParcelaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nTotal: R$ ${valorTotalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nCartão: ${valores.cartao}`;
          break;
        case 'investimento':
          mensagem = `Investimento salvo!\n${valores.nome} - R$ ${Number(valores.valorInicial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nMeta: R$ ${Number(valores.meta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          break;
        default:
          mensagem = 'Item salvo com sucesso!';
      }

          setAlerta({
            visivel: true,
            titulo: 'Sucesso!',
            mensagem,
            icone: 'check-circle-outline',
            corIcone: colors.balance,
            textoBotao: 'Entendi',
          });

          setValores(getValoresIniciais());
        };

  const processarValores = (vals) => {
    const processados = { ...vals };

    if (processados.valor) processados.valor = Number(processados.valor || 0);
    if (processados.valorInicial) processados.valorInicial = Number(processados.valorInicial || 0);
    if (processados.meta) processados.meta = Number(processados.meta || 0);
    if (processados.valorTotal) processados.valorTotal = Number(processados.valorTotal || 0);
    if (processados.valorParcela) processados.valorParcela = Number(processados.valorParcela || 0);
    if (processados.parcelas) processados.parcelas = parseInt(processados.parcelas, 10) || 1;
    if (processados.data) processados.data = formatarDataParaSalvar(processados.data);
    if (processados.dataVencimento) processados.dataVencimento = formatarDataParaSalvar(processados.dataVencimento);
    if (processados.dataCompra) processados.dataCompra = formatarDataParaSalvar(processados.dataCompra);
    if (processados.dataInicio) processados.dataInicio = formatarDataParaSalvar(processados.dataInicio);

    return processados;
  };

  const getCamposObrigatorios = () => {
    switch (tipo) {
      case 'entrada': return ['descricao', 'valor', 'data'];
      case 'gasto': return ['descricao', 'valor', 'dataVencimento'];
      case 'emprestimo': return ['descricao', 'valorTotal', 'totalParcelas', 'dataInicio'];
      case 'cartao': return ['descricao', 'dataCompra', 'pessoa', 'cartao', modoCalculo === 'total' ? 'valorTotal' : 'valorParcela'];
      case 'investimento': return ['nome', 'valorInicial', 'instituicao'];
      default: return [];
    }
  };


  const renderCamposPorTipo = () => {
    switch (tipo) {
      case 'entrada':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Descrição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.descricao || ''}
                onChangeText={(texto) => handleChange('descricao', texto)}
                placeholder="Ex: Salário"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Membro</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.membro || ''}
                onChangeText={(texto) => handleChange('membro', texto)}
                placeholder="Ex: Rafael"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valorTexto}
                onChangeText={handleValorTextoChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Recebimento *</Text>
                <SeletorData
                  value={valores.data || ''}
                  onChangeText={(novaData) => handleChange('data', novaData)}
                />
              </View>
            )}

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.categoria || ''}
                onChangeText={(texto) => handleChange('categoria', texto)}
                placeholder="Ex: Trabalho"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      case 'gasto':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Descrição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.descricao || ''}
                onChangeText={(texto) => handleChange('descricao', texto)}
                placeholder="Ex: Aluguel"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valorTexto}
                onChangeText={handleValorTextoChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Vencimento *</Text>
                <SeletorData
                  value={valores.dataVencimento || ''}
                  onChangeText={(novaData) => handleChange('dataVencimento', novaData)}
                />
              </View>
            )}

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.categoria || ''}
                onChangeText={(texto) => handleChange('categoria', texto)}
                placeholder="Ex: Moradia"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

            case 'emprestimo':
              return (
                <>
                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Descrição *</Text>
                    <TextInput
                      style={globalStyles.input}
                      value={valores.descricao || ''}
                      onChangeText={(texto) => handleChange('descricao', texto)}
                      placeholder="Ex: Empréstimo Carro"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  {/* BOTÕES DE SELEÇÃO */}
                  <View style={[globalStyles.inputGroup, { alignItems: 'center', marginTop: 10 }]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'transparent',
                      }}
                    >
                      {[
                        { modo: 'total', label: 'Valor Total' },
                        { modo: 'parcela', label: 'Valor da Parcela' },
                      ].map(({ modo, label }) => {
                        const isSelecionado = modoCalculo === modo;
                        return (
                          <TouchableOpacity
                            key={modo}
                            activeOpacity={0.8}
                            onPress={() => {
                              import('react-native').then(({ LayoutAnimation }) =>
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                              );
                              setModoCalculo(modo);
                            }}
                            style={{
                              flex: 1,
                              alignItems: 'center',
                              paddingVertical: 10,
                              backgroundColor: isSelecionado
                                ? colors.primary
                                : `${colors.textSecondary}10`,
                            }}
                          >
                            <Text
                              style={{
                                color: isSelecionado
                                  ? colors.background
                                  : `${colors.textSecondary}80`, 
                                fontWeight: isSelecionado ? '700' : '500',
                              }}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* CAMPOS DEPENDENTES */}
                  {modoCalculo === null && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        textAlign: 'center',
                        marginBottom: 10,
                      }}
                    >
                      Selecione um modo de cálculo acima
                    </Text>
                  )}

                  {modoCalculo === 'total' && (
                    <>
                      <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.label}>Valor Total *</Text>
                        <TextInput
                          style={globalStyles.input}
                          value={valorTotalTexto}
                          onChangeText={handleValorTotalTextoChange}
                          placeholder="R$ 0,00"
                          keyboardType="numeric"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>

                      <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.label}>Número de Parcelas *</Text>
                        <TextInput
                          style={globalStyles.input}
                          value={valores.totalParcelas?.toString() || ''}
                          onChangeText={(texto) => handleChange('totalParcelas', texto)}
                          placeholder="Ex: 12"
                          keyboardType="numeric"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </>
                  )}

                  {modoCalculo === 'parcela' && (
                    <>
                      <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.label}>Valor da Parcela *</Text>
                        <TextInput
                          style={globalStyles.input}
                          value={valorParcelaTexto}
                          onChangeText={handleValorParcelaTextoChange}
                          placeholder="R$ 0,00"
                          keyboardType="numeric"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>

                      <View style={globalStyles.inputGroup}>
                        <Text style={globalStyles.label}>Número de Parcelas *</Text>
                        <TextInput
                          style={globalStyles.input}
                          value={valores.totalParcelas?.toString() || ''}
                          onChangeText={(texto) => handleChange('totalParcelas', texto)}
                          placeholder="Ex: 12"
                          keyboardType="numeric"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </>
                  )}

                  {!datasPadraoPorDescricao[valores.descricao] && (
                    <View style={globalStyles.inputGroup}>
                      <Text style={globalStyles.label}>Data de Início *</Text>
                      <SeletorData
                        value={valores.dataInicio || ''}
                        onChangeText={(novaData) => handleChange('dataInicio', novaData)}
                      />
                    </View>
                  )}

                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Pessoa/Instituição</Text>
                    <TextInput
                      style={globalStyles.input}
                      value={valores.pessoa || ''}
                      onChangeText={(texto) => handleChange('pessoa', texto)}
                      placeholder="Ex: Banco XYZ"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Categoria</Text>
                    <TextInput
                      style={globalStyles.input}
                      value={valores.categoria || ''}
                      onChangeText={(texto) => handleChange('categoria', texto)}
                      placeholder="Ex: Financiamento"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </>
              );

      case 'cartao':
        return (
    <>
      <View style={globalStyles.inputGroup}>
        <Text style={globalStyles.label}>Descrição *</Text>
        <TextInput
          style={globalStyles.input}
          value={valores.descricao || ''}
          onChangeText={(texto) => handleChange('descricao', texto)}
          placeholder="Ex: Empréstimo Carro"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Pessoa *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.pessoa || ''}
                onChangeText={(texto) => handleChange('pessoa', texto)}
                placeholder="Quem fez a compra"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Cartão *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.cartao || ''}
                onChangeText={(texto) => handleChange('cartao', texto)}
                placeholder="Ex: Nubank, C6, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
      {/* BOTÕES DE SELEÇÃO */}
<View style={[globalStyles.inputGroup, { alignItems: 'center', marginTop: 10}]}>
  <View
    style={{
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'transparent',
    }}
  >
    {[
      { modo: 'total', label: 'Valor Total' },
      { modo: 'parcela', label: 'Valor da Parcela' },
    ].map(({ modo, label }) => {
      const isSelecionado = modoCalculo === modo;
      return (
        <TouchableOpacity
          key={modo}
          activeOpacity={0.8}
          onPress={() => {
            import('react-native').then(({ LayoutAnimation }) =>
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
            );
            setModoCalculo(modo);
          }}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            backgroundColor: isSelecionado
              ? colors.primary
              : `${colors.textSecondary}10`, // cor mais sutil no fundo
          }}
        >
          <Text
            style={{
              color: isSelecionado
                ? colors.background
                : `${colors.textSecondary}99`, // texto com leve transparência
              fontWeight: isSelecionado ? '700' : '500',
            }}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
            {/* Renderização condicional dos campos */}
            {modoCalculo === 'total' && (
              <>
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Valor Total *</Text>
                  <TextInput
                    style={globalStyles.input}
                    value={valorTotalTexto}
                    onChangeText={handleValorTotalTextoChange}
                    placeholder="R$ 0,00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Número de Parcelas *</Text>
                  <TextInput
                    style={globalStyles.input}
                    value={valores.totalParcelas?.toString() || ''}
                    onChangeText={(texto) => handleChange('totalParcelas', texto)}
                    placeholder="Ex: 12"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}

            {modoCalculo === 'parcela' && (
              <>
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Valor da Parcela *</Text>
                  <TextInput
                    style={globalStyles.input}
                    value={valorParcelaTexto}
                    onChangeText={handleValorParcelaTextoChange}
                    placeholder="R$ 0,00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Número de Parcelas *</Text>
                  <TextInput
                    style={globalStyles.input}
                    value={valores.totalParcelas?.toString() || ''}
                    onChangeText={(texto) => handleChange('totalParcelas', texto)}
                    placeholder="Ex: 12"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}


            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data da Compra *</Text>
                <SeletorData
                  value={valores.dataCompra || ''}
                  onChangeText={(novaData) => handleChange('dataCompra', novaData)}
                />
              </View>
            )}

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.categoria || ''}
                onChangeText={(texto) => handleChange('categoria', texto)}
                placeholder="Ex: Alimentação"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

case 'investimento':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Nome do Investimento *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.nome || ''}
                onChangeText={(texto) => handleChange('nome', texto)}
                placeholder="Ex: Reserva de Emergência"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor Inicial *</Text>
              <TextInput
                style={globalStyles.input}
                value={valorInicialTexto}
                onChangeText={handleValorInicialTextoChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Instituição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.instituicao || ''}
                onChangeText={(texto) => handleChange('instituicao', texto)}
                placeholder="Ex: Nubank, XP, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Definir uma meta? (Opcional)</Text>
              <TextInput
                style={globalStyles.input}
                value={metaTexto}
                onChangeText={handleMetaTextoChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      default:
        return (
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Tipo não suportado</Text>
          </View>
        );
    }
  };

  return (
     <>
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={globalStyles.modalOverlay}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{titulo || `Novo ${tipo}`}</Text>
            <TouchableOpacity onPress={aoFechar}>
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {renderCamposPorTipo()}
          </ScrollView>

          <View style={globalStyles.buttonRow}>
            <View style={globalStyles.rightButtons}>
              <TouchableOpacity style={globalStyles.cancelButton} onPress={aoFechar}>
                <Text style={globalStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={globalStyles.saveButton} onPress={handleSalvar}>
                <Text style={globalStyles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
          

    </Modal>
    <AlertaModal
      visible={alerta.visivel}
      onClose={() => setAlerta({ visivel: false })}
      {...alerta}
        />
  </>
  );
}; 

export default ModalCriacao;
