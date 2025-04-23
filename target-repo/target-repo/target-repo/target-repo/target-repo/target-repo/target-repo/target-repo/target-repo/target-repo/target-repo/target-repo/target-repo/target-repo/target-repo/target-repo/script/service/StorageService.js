class StorageService {
  static currentFile = "";
  static currentSheet = "";
  static currentData = {};
  static currentRecord = {};
  static formMetadata = {};

  constructor() {
    this.currentDataKey = "currentData";
    this.formMetadataKey = "formMetadata";
    this.getCurrentData = this.getCurrentData.bind(this);
    this.setCurrentData = this.setCurrentData.bind(this);
    this.setFormMetadata = this.setFormMetadata.bind(this);
    this.getFormMetadata = this.getFormMetadata.bind(this);
    this.clear = this.clear.bind(this);
  }

  setCurrentData(data) {
  try{
    localStorage.setItem(this.currentDataKey, JSON.stringify(data));
    } catch {
           console.log("Error Setting Current Data")
    }
  }
  setFormMetadata(data) {
   try{
    localStorage.setItem(this.formMetadataKey, JSON.stringify(data));
    } catch {
               console.log("Error Setting Form Data")
        }
  }

  getFormMetadata() {
    if (formMetadata) return formMetadata;
    let dataJSON = localStorage.getItem(this.formMetadataKey);
    dataJSON = dataJSON ? JSON.parse(dataJSON) : [];
    return dataJSON;
  }

  getCurrentData() {
    try {
      let dataJSON = localStorage.getItem(this.currentDataKey);
      dataJSON = dataJSON ? JSON.parse(dataJSON) : [];
      if (Object.keys(this.currentData).length <= 0) {
        this.currentFile = Object.keys(dataJSON)[0];
        this.currentSheet = Object.keys(dataJSON[StorageService.currentFile])[0];
        this.currentData = dataJSON;
        this.currentRecord = jQuery.extend(true, {}, this.currentData[this.currentFile][this.currentSheet]);
      }
    } catch {
       $("#errorModal").modal("show");
    }
  }
  clear() {
    localStorage.clear();
  }
}
