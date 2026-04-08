const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} = require("firebase/firestore");

class OrgService {
  constructor() {
    this.orgsCol = collection(db, "organizations");
    this.agesCol = collection(db, "ages");
  }

  // ==================== ORGANIZATION CRUD ====================

  async createOrganization(data) {
    const docRef = await addDoc(this.orgsCol, {
      ...data,
      sports: data.sports || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() };
  }

  async getAllOrganizations({ status, city }) {
    const snapshot = await getDocs(this.orgsCol);
    let orgs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    if (status) orgs = orgs.filter((o) => o.status === status);
    if (city) orgs = orgs.filter((o) => o.city === city);

    return orgs;
  }

  async getOrganizationById(id) {
    const docSnap = await getDoc(doc(this.orgsCol, id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  async updateOrganization(id, updates) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();

    // Merge sports if provided
    if (updates.sports) {
      orgData.sports = orgData.sports || {};
      for (const [sportName, sportData] of Object.entries(updates.sports)) {
        orgData.sports[sportName] = sportData;
      }
      delete updates.sports;
    }

    const finalData = { ...orgData, ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(orgRef, finalData);

    const updatedSnap = await getDoc(orgRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  async deleteOrganization(id) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");
    await deleteDoc(orgRef);
  }

  // ==================== SPORTS MANAGEMENT ====================

  async addSport(id, sportName, divisions = []) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();
    orgData.sports = orgData.sports || {};

    if (orgData.sports[sportName]) throw new Error("Sport already exists");

    orgData.sports[sportName] = { divisions };

    await updateDoc(orgRef, { sports: orgData.sports, updatedAt: new Date().toISOString() });
    const updatedSnap = await getDoc(orgRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  async updateSport(id, sportName, divisions) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();
    orgData.sports = orgData.sports || {};

    if (!orgData.sports[sportName]) throw new Error("Sport not found");

    orgData.sports[sportName] = { divisions };

    await updateDoc(orgRef, { sports: orgData.sports, updatedAt: new Date().toISOString() });
    const updatedSnap = await getDoc(orgRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  async removeSport(id, sportName) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();
    orgData.sports = orgData.sports || {};

    if (!orgData.sports[sportName]) throw new Error("Sport not found");

    delete orgData.sports[sportName];

    await updateDoc(orgRef, { sports: orgData.sports, updatedAt: new Date().toISOString() });
    const updatedSnap = await getDoc(orgRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  // ==================== DIVISION MANAGEMENT ====================

  async addDivision(id, sportName, division) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();
    orgData.sports = orgData.sports || {};

    if (!orgData.sports[sportName]) throw new Error("Sport not found");
    if (!orgData.sports[sportName].divisions) orgData.sports[sportName].divisions = [];

    if (orgData.sports[sportName].divisions.includes(division))
      throw new Error("Division already exists");

    orgData.sports[sportName].divisions.push(division);

    await updateDoc(orgRef, { sports: orgData.sports, updatedAt: new Date().toISOString() });
    const updatedSnap = await getDoc(orgRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  async removeDivision(id, sportName, division) {
    const orgRef = doc(this.orgsCol, id);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();
    orgData.sports = orgData.sports || {};

    if (!orgData.sports[sportName]) throw new Error("Sport not found");
    if (!orgData.sports[sportName].divisions || !orgData.sports[sportName].divisions.includes(division))
      throw new Error("Division not found");

    orgData.sports[sportName].divisions = orgData.sports[sportName].divisions.filter((d) => d !== division);

    await updateDoc(orgRef, { sports: orgData.sports, updatedAt: new Date().toISOString() });
    const updatedSnap = await getDoc(orgRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  // ==================== AGE GROUPS ====================

  // ✅ Create new age group
  async createAgeGroup(data) {
    if (!data.age || !data.ageGroup)
      throw new Error("Both 'age' and 'ageGroup' are required");

    // Check duplicate
    const snapshot = await getDocs(this.agesCol);
    const exists = snapshot.docs.find((d) => d.data().age === data.age);
    if (exists) throw new Error(`Age group with age '${data.age}' already exists`);

    const docRef = await addDoc(this.agesCol, {
      age: data.age,
      ageGroup: data.ageGroup,
      createdAt: new Date().toISOString(),
    });
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() };
  }

  // ✅ Get all age groups
  async getAllAgeGroups() {
    console.log("printing snapshot")
    const snapshot = await getDocs(this.agesCol);
    return snapshot;
  }

  // ✅ Get specific age group by "age" value (e.g. U6)
  async getAgeGroupByAge(age) {
    const snapshot = await getDocs(this.agesCol);
    const ageGroup = snapshot.docs.find((d) => d.data().age === age);
    if (!ageGroup) return null;
    return { id: ageGroup.id, ...ageGroup.data() };
  }

  // ✅ Update an existing age group
  async updateAgeGroup(age, updates) {
    const snapshot = await getDocs(this.agesCol);
    const target = snapshot.docs.find((d) => d.data().age === age);
    if (!target) throw new Error("Age group not found");

    const ref = doc(this.agesCol, target.id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const updatedSnap = await getDoc(ref);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }

  // ✅ Delete an age group by age
  async deleteAgeGroup(age) {
    const snapshot = await getDocs(this.agesCol);
    const target = snapshot.docs.find((d) => d.data().age === age);
    if (!target) throw new Error("Age group not found");

    await deleteDoc(doc(this.agesCol, target.id));
    return { success: true, message: `Age group '${age}' deleted` };
  }


  // ==================== BULK OPERATIONS ====================

  // ✅ Delete all organizations (use with caution!)
  async deleteAllOrganizations() {
    try {
      const snapshot = await getDocs(this.orgsCol);
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(this.orgsCol, docSnap.id))
      );
      
      await Promise.all(deletePromises);
      
      return { 
        success: true, 
        message: `Successfully deleted ${snapshot.docs.length} organizations`,
        count: snapshot.docs.length
      };
    } catch (error) {
      throw new Error(`Failed to delete all organizations: ${error.message}`);
    }
  }

  // ✅ Delete all age groups
  async deleteAllAgeGroups() {
    try {
      const snapshot = await getDocs(this.agesCol);
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(this.agesCol, docSnap.id))
      );
      
      await Promise.all(deletePromises);
      
      return { 
        success: true, 
        message: `Successfully deleted ${snapshot.docs.length} age groups`,
        count: snapshot.docs.length
      };
    } catch (error) {
      throw new Error(`Failed to delete all age groups: ${error.message}`);
    }
  }

  // ✅ Delete everything (organizations + age groups)
  async deleteAllData() {
    try {
      const [orgsResult, agesResult] = await Promise.all([
        this.deleteAllOrganizations(),
        this.deleteAllAgeGroups()
      ]);

      return {
        success: true,
        message: 'All data deleted successfully',
        results: {
          organizations: orgsResult,
          ageGroups: agesResult
        },
        totalDeleted: orgsResult.count + agesResult.count
      };
    } catch (error) {
      throw new Error(`Failed to delete all data: ${error.message}`);
    }
  }


}




module.exports = new OrgService();
