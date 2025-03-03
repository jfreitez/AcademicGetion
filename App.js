import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Workbook } from 'exceljs';

// ================ CONFIGURACIÓN SUPABASE ================
const supabase = createClient(
  'https://bjsqvitjazsmgivusboe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqc3F2aXRqYXpzbWdpdnVzYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTI0NDksImV4cCI6MjA1NjU4ODQ0OX0.goqwwsHQNU_nz2OYM7-AR1KclqtVQ4GyWg5qpsW4V60'
);

// ================ ESTILOS GLOBALES ================
const styles = StyleSheet.create({
  // Diseño Login
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#f0f4f8'
  },
  loginInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: 'white'
  },
  
  // Diseño Profesor
  professorContainer: {
    flex: 1,
    padding: 20
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    elevation: 3
  },
  inputLabel: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8
  },
  
  // Diseño Coordinación
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6'
  },
  
  // Botones
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 15
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 15
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600'
  }
});

// ================ PANTALLA LOGIN ================
const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.user.email.endsWith('@coordinacion.com')) {
        navigation.navigate('CoordinatorDashboard');
      } else {
        navigation.navigate('ProfessorDashboard');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const exitApp = () => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      Alert.alert('iOS', 'Presione el botón home para salir');
    }
  };

  return (
    <View style={styles.loginContainer}>
      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        style={styles.loginInput}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.loginInput}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : (
        <>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Ingresar al sistema</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerButton, { marginTop: 15 }]}
            onPress={exitApp}
          >
            <Text style={styles.buttonText}>Salir de la aplicación</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// ================ PANTALLA PROFESOR ================
const ProfessorDashboard = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [formData, setFormData] = useState({
    enrolled: '',
    dictated: '',
    evaluated: '',
    approved: ''
  });

  // Obtener asignaturas del profesor
  useEffect(() => {
    const loadSubjects = async () => {
      const { data, error } = await supabase
        .from('academic_load')
        .select('subject_code, section, subjects(name)')
        .eq('professor_id', supabase.auth.user()?.id)
        .limit(5);

      if (error) Alert.alert('Error', 'No se pudieron cargar las asignaturas');
      else setSubjects(data || []);
    };
    loadSubjects();
  }, []);

  // Guardar datos en Supabase
  const handleSave = async () => {
    try {
      const subjectInfo = subjects.find(s => 
        `${s.subject_code}|${s.section}` === selectedSubject
      );

      const { error } = await supabase.from('progress_data').upsert({
        subject_code: subjectInfo.subject_code,
        section: subjectInfo.section,
        subject_name: subjectInfo.subjects.name,
        enrolled_students: parseInt(formData.enrolled),
        progress_percentage: parseFloat(formData.dictated),
        progress_evaluated: parseFloat(formData.evaluated),
        approved: parseInt(formData.approved),
        reproved: parseInt(formData.enrolled) - parseInt(formData.approved),
        professor_id: supabase.auth.user()?.id
      });

      if (error) throw error;
      Alert.alert('Éxito', 'Datos registrados correctamente');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Cancelar y resetear formulario
  const handleCancel = () => {
    setSelectedSubject('');
    setFormData({ enrolled: '', dictated: '', evaluated: '', approved: '' });
    navigation.goBack();
  };
  
    // Cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.professorContainer}>
      <View style={styles.subjectCard}>
        <Text style={styles.inputLabel}>Seleccione asignatura:</Text>
        <Picker
          selectedValue={selectedSubject}
          onValueChange={setSelectedSubject}
          dropdownIconColor="#3b82f6"
        >
          <Picker.Item label="Seleccione una asignatura..." value="" />
          {subjects.map((subject, index) => (
            <Picker.Item
              key={index}
              label={`${subject.subjects.name} (${subject.subject_code} - Sección ${subject.section})`}
              value={`${subject.subject_code}|${subject.section}`}
            />
          ))}
        </Picker>

        <Text style={styles.inputLabel}>Estudiantes inscritos:</Text>
        <TextInput
          placeholder="Ej: 35"
          keyboardType="numeric"
          value={formData.enrolled}
          onChangeText={text => setFormData({...formData, enrolled: text})}
          style={styles.loginInput}
        />

        <Text style={styles.inputLabel}>% Materia dictada:</Text>
        <TextInput
          placeholder="Ej: 75.5"
          keyboardType="numeric"
          value={formData.dictated}
          onChangeText={text => setFormData({...formData, dictated: text})}
          style={styles.loginInput}
        />

        <Text style={styles.inputLabel}>% Materia evaluada:</Text>
        <TextInput
          placeholder="Ej: 60.0"
          keyboardType="numeric"
          value={formData.evaluated}
          onChangeText={text => setFormData({...formData, evaluated: text})}
          style={styles.loginInput}
        />

        <Text style={styles.inputLabel}>Estudiantes aprobados:</Text>
        <TextInput
          placeholder="Ej: 30"
          keyboardType="numeric"
          value={formData.approved}
          onChangeText={text => setFormData({...formData, approved: text})}
          style={styles.loginInput}
        />
      </View>

      <View style={{ gap: 10, marginTop: 20 }}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSave}
          disabled={!selectedSubject}
        >
          <Text style={styles.buttonText}>💾 Guardar datos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleCancel}
        >
          <Text style={styles.buttonText}>❌ Cancelar operación</Text>
        </TouchableOpacity>
		
		<TouchableOpacity
          style={styles.dangerButton}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>🔒 Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ================ PANTALLA COORDINACIÓN ================
const CoordinatorDashboard = ({ navigation }) => {
  const [reportData, setReportData] = useState([]);

  // Cargar todos los datos
  useEffect(() => {
    const loadReportData = async () => {
      const { data, error } = await supabase
        .from('progress_data')
        .select('*, professors(name)');

      if (error) Alert.alert('Error', 'Error al cargar los datos');
      else setReportData(data || []);
    };
    loadReportData();
  }, []);

  // Generar reporte Excel profesional
  const generateExcelReport = async () => {
    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Reporte Académico');

      // Configurar encabezados
      worksheet.columns = [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Asignatura', key: 'subject', width: 30 },
        { header: 'Sección', key: 'section', width: 10 },
        { header: 'Inscritos', key: 'enrolled', width: 12 },
        { header: '% Dictado', key: 'dictated', width: 15 },
        { header: '% Evaluado', key: 'evaluated', width: 15 },
        { header: 'Aprobados', key: 'approved', width: 15 },
        { header: 'Aplazados', key: 'reproved', width: 15 }
      ];

      // Agregar datos
      reportData.forEach(item => {
        worksheet.addRow({
          code: item.subject_code,
          subject: item.subject_name,
          section: item.section,
          enrolled: item.enrolled_students,
          dictated: item.progress_percentage,
          evaluated: item.progress_evaluated,
          approved: item.approved,
          reproved: item.reproved
        });
      });

      // Estilo profesional
      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach(column => {
        column.alignment = { horizontal: 'center' };
      });

      // Guardar y compartir
      const path = `${FileSystem.documentDirectory}Reporte_Academico_${Date.now()}.xlsx`;
      await workbook.xlsx.writeFile(path);
      await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte');
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Reporte General</Text>

      {reportData.map((item, index) => (
        <View key={index} style={styles.reportCard}>
          <Text style={{ fontWeight: 'bold' }}>{item.subject_name} ({item.subject_code})</Text>
          <Text>Sección: {item.section}</Text>
          <Text>Profesor: {item.professors?.name}</Text>
          <Text>Inscritos: {item.enrolled_students}</Text>
          <Text>Dictado: {item.progress_percentage}%</Text>
          <Text>Evaluado: {item.progress_evaluated}%</Text>
          <Text>Aprobados: {item.approved}</Text>
          <Text>Aplazados: {item.reproved}</Text>
        </View>
      ))}

      <View style={{ gap: 10, marginTop: 20 }}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={generateExcelReport}
        >
          <Text style={styles.buttonText}>📊 Exportar a Excel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>🔒 Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ================ CONFIGURACIÓN NAVEGACIÓN ================
const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : user.email.endsWith('@coordinacion.com') ? (
          <Stack.Screen
            name="CoordinatorDashboard"
            component={CoordinatorDashboard}
            options={{ title: 'Panel de Coordinación' }}
          />
        ) : (
          <Stack.Screen
            name="ProfessorDashboard"
            component={ProfessorDashboard}
            options={{ title: 'Panel del Profesor' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}