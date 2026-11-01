import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { loadProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';
import { COLORS, FONTS } from '../src/constants/theme';

export default function WalletScreen() {
  const {t,lang} = useLang();
  const [progress,setProgress] = useState({coins:0,walletHistory:[]});
  useFocusEffect(useCallback(()=>{let active=true;loadProgress().then(p=>{if(active)setProgress(p);}).catch(()=>{});return()=>{active=false};},[]));
  const events = Array.isArray(progress.walletHistory) && progress.walletHistory.length ? progress.walletHistory : [{id:'opening',kind:'opening',amount:progress.coins,balanceAfter:progress.coins}];
  const label = event => event.kind==='opening' ? (t.walletOpening || 'İlk kayıtlı bakiye')
    : event.source==='level' ? (t.walletLevel || 'Bölüm {n} ödülü').replace('{n}',event.levelId)
    : event.source==='daily' ? (t.walletDaily || 'Günlük bulmaca ödülü')
    : event.source==='daily_login' ? (t.walletVisit || 'Günlük giriş ödülü')
    : event.source==='achievement' ? (t.walletAchievement || 'Başarım ödülü')
    : event.source==='ad' ? (t.walletAd || 'Reklam ödülü')
    : event.source==='cloud' ? (t.walletCloud || 'Bulut kaydıyla eşitleme')
    : event.source==='booster' ? `${t.walletTool || 'Yardımcı'}: ${t[event.toolKey] || event.toolKey}`
    : event.source==='moves' ? (t.walletMoves || 'Ek hamle')
    : (event.description || t.walletOther || 'Bakiye değişimi');
  return <View style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel={t.home || 'Geri'} onPress={()=>router.canGoBack()?router.back():router.replace('/')}><MaterialIcons name="arrow-back" size={28} color={COLORS.onSurface}/></TouchableOpacity>
      <Text style={styles.title}>{t.walletTitle || 'Coin hareketleri'}</Text>
    </View>
    <Text style={styles.balance}>{progress.coins} {t.gold || 'coin'}</Text>
    <Text style={styles.note}>{t.walletNote || 'Bu cihazdaki son 200 hareket gösterilir. Önceki sürümün ayrıntıları bilinmediği için mevcut bakiye ilk kayıt olarak korunur.'}</Text>
    <ScrollView contentContainerStyle={{paddingBottom:40}}>{[...events].reverse().map(event=><View key={event.id} style={styles.row}>
      <View style={{flex:1}}><Text style={styles.label}>{label(event)}</Text>
        {event.createdAt && <Text style={styles.muted}>{new Date(event.createdAt).toLocaleString(lang)}</Text>}
        <Text style={styles.muted}>{t.walletBalance || 'Bakiye'}: {event.balanceAfter}</Text>
      </View>
      <Text style={[styles.amount,{color:event.amount<0?COLORS.fail:COLORS.success}]}>{event.amount>0?'+':''}{event.amount}</Text>
    </View>)}</ScrollView>
  </View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:COLORS.surface,paddingHorizontal:20,paddingTop:60},header:{flexDirection:'row',alignItems:'center',gap:16,marginBottom:20},title:{fontFamily:FONTS.headlineBlack,fontSize:22,color:COLORS.onSurface},balance:{fontFamily:FONTS.headlineBlack,fontSize:30,color:COLORS.coin},note:{fontFamily:FONTS.body,fontSize:13,lineHeight:19,color:COLORS.onSurfaceVariant,marginVertical:16},row:{flexDirection:'row',gap:12,paddingVertical:16,borderBottomWidth:1,borderColor:COLORS.panelBorder},label:{fontFamily:FONTS.bodyBold,fontSize:15,color:COLORS.onSurface},muted:{fontFamily:FONTS.body,fontSize:12,color:COLORS.onSurfaceVariant,marginTop:4},amount:{fontFamily:FONTS.headlineBlack,fontSize:20}});
