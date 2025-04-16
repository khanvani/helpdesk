class FormController {
  static file = {};
  constructor(storageService, excelService) {
    this.storageService = storageService;
    this.excelService = excelService;
    this.refresh = this.refresh.bind(this);
    this.init = this.init.bind(this);
    this.validate = this.validate.bind(this);
    this.calculateAge = this.calculateAge.bind(this);
    this.print = this.print.bind(this);
    this.upload = this.upload.bind(this);
    this.formatDate = this.formatDate.bind(this);

    StorageService.formMetadata = storageService.getFormMetadata();
    this.init(this);
  }
  init(event) {
    $(document).ready(() => {
      $("#m-refresh").click(() => $("#inputExcel").trigger("click"));
      $("#m-upload").click(() => $("#inputPDF").trigger("click"));
      $("#inputExcel").change(this.refresh);
      $("#inputPDF").change(this.upload);
      $("#print").click(this.print);
      $(".selectpicker").selectpicker();
      this.validate();
    });
  }
  calculateAge(birthDate) {
    var today = new Date();
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  validate() {
    $("#newForm .form-control[required]").on("blur", function () {
      if ($(this).val().trim() == "") {
        $(this).addClass("invalid");
      } else {
        $(this).removeClass("invalid");
      }
    });
    $(".selectpicker").on("change", function () {
      if ($(this).val() === "") {
        $(this).parent().find(".btn").addClass("invalid");
      } else {
        $(this).parent().find(".btn").removeClass("invalid");
      }
    });

    $("#married").change(function () {
      if ($(this).val() == "Yes") {
        $("#spouseName").prop("disabled", false).prop("required", true);
        $("#fathersName").val("");
        $("#spouseName").val(($("#middleName").val() ? $("#middleName").val() + " " : "") + $("#lastName").val());
      } else {
        $("#spouseName").prop("disabled", true).val("").prop("required", false);
        $("#spouseName").val("");
        $("#fathersName").val(($("#middleName").val() ? $("#middleName").val() + " " : "") + $("#lastName").val());
      }
    });
    $("#lastName").on("blur", (event) => {
      $("#fathersName").val(($("#middleName").val() ? $("#middleName").val() + " " : "") + $("#lastName").val());
    });
    $("#bDate").on("blur", (event) => {
      var userInput = $(event.target).val();
      var birthDate = new Date(userInput);
      var age = this.calculateAge(birthDate);
      if (age > 16 && age <= 70) {
        console.log("Age is within the acceptable range.");
      } else {
        alert("Age must be greater than 16 and less than or equal to 70.");
        $(event.target).val("");
      }
    });
    $("#pin").on("blur", function () {
      var pin = $(this).val();
      var $postOfficeSelect = $("#po");
      $postOfficeSelect.empty();
      var matchingOffices = pinCode.filter(function (data) {
        return data.Pincode == pin;
      });

      if (matchingOffices.length) {
        $(matchingOffices).each(function (index, office) {
          $postOfficeSelect.append(
            $("<option>", {
              value: office.OfficeName,
              text: office.OfficeName,
            })
          );
        });
      } else {
        $postOfficeSelect.append(
          $("<option>", {
            value: "",
            text: "No Office Found",
          })
        );
      }
      $postOfficeSelect.prop("selectedIndex", 0);
    });
    $("#rGrno1").on("input", function () {
      var enteredGR = $(this).val();
      var found = StorageService.formMetadata.find((obj) => obj.GR_No === enteredGR);

      if (found) {
        $("#rName1").val(found.Name);
        $("#rDept1").val(found.Department);
        $("#rCentre1").val(found.Center);
        $("#rName1").removeClass("invalid");
        $("#rDept1").removeClass("invalid");
        $("#rCentre1").removeClass("invalid");
      } else {
        $("#rName1").val("");
        $("#rDept1").val("");
        $("#rCentre1").val("");
        $("#rName1").addClass("invalid");
        $("#rDept1").addClass("invalid");
        $("#rCentre1").addClass("invalid");
      }
    });
    $("#rGrno2").on("input", function () {
      var enteredGR = $(this).val();
      var found = StorageService.formMetadata.find((obj) => obj.GR_No === enteredGR);

      if (found) {
        $("#rName2").val(found.Name);
        $("#rDept2").val(found.Department);
        $("#rCentre2").val(found.Center);
        $("#rName2").removeClass("invalid");
        $("#rDept2").removeClass("invalid");
        $("#rCentre2").removeClass("invalid");
      } else {
        $("#rName2").val("");
        $("#rDept2").val("");
        $("#rCentre2").val("");
        $("#rName2").addClass("invalid");
        $("#rDept2").addClass("invalid");
        $("#rCentre2").addClass("invalid");
      }
    });
    $("#satsang").change(function () {
      if ($(this).val() == "Yes") {
        $("#centre").prop("disabled", false).prop("required", true);
      } else {
        $("#centre").prop("disabled", true).val("").prop("required", false);
      }
    });
    $("#initiated").change(function () {
      if ($(this).val() == "Yes") {
        $("#iDate").prop("disabled", false).prop("required", true);
        $("#iBy").prop("disabled", false).prop("required", true);
        $("#iPlace").prop("disabled", false).prop("required", true);
      } else {
        $("#iDate").prop("disabled", true).val("").prop("required", false);
        $("#iBy").prop("disabled", true).val("").prop("required", false);
        $("#iPlace").prop("disabled", true).val("").prop("required", false);
      }
    });
    $(".close, #pdfPreviewModal").on("click", function (event) {
      if (event.target.className === "modal" || event.target.className === "close") {
        $("#pdfPreviewModal").hide();
      }
    });
  }

  refresh(event) {
    if (this.excelService) {
      this.excelService.uploadAndProcessFile(event).catch((error) => console.error("Error processing Excel file", error));
    }
  }

  async print(event) {
    try {
      event.preventDefault();
      $("#newForm .form-control").removeClass("invalid");
      $("#newForm .form-control[required]").each(function () {
        if ($(this).val() === "") {
          if ($(this).hasClass("selectpicker")) {
            $(this).parent().find(".btn").addClass("invalid");
          } else {
            $(this).addClass("invalid");
          }
        }
      });
      if ($("#newForm .invalid").length > 0) {
        return false;
      }

      const file = FormController.file;
      if (!file) {
        alert("Please upload a PDF file.");
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();

      let formData = {};
      $("#newForm")
        .serializeArray()
        .forEach((field) => {
          if (field.name.toLowerCase().includes("date")) {
            formData[field.name] = this.formatDate(new Date(field.value));
          }
          if (["hype", "dia", "skin", "epile"].some((synonym) => field.name.toLowerCase().includes(synonym))) {
            if (field.value == 1) {
              formData[field.name] = "YES";
            } else {
              formData[field.name] = "NO";
            }
          } else {
            formData[field.name] = field.value.toUpperCase();
          }
        });

      Object.entries(formData).forEach(([key, value]) => {
        const field = form.getField(key);
        if (field instanceof PDFLib.PDFTextField || field instanceof PDFLib.PDFDropdown) {
          field.setText(value);
        }
      });

      form.flatten();
      const pdfBytes = await pdfDoc.save(); // Ensure `await` is used and variable name matches
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      $("#pdfPreview").attr("src", url);
      $("#pdfPreviewModal").show();
    } catch (error) {
      console.error("Failed to process the PDF file: ", error);
      alert("An error occurred while processing the PDF.");
    }
  }
  upload(event) {
    FormController.file = event.target.files[0];
  }
  formatDate(date) {
    let day = date.getDate();
    let month = date.getMonth() + 1;
    const year = date.getFullYear();
    day = day < 10 ? `0${day}` : day;
    month = month < 10 ? `0${month}` : month;
    return `${day}/${month}/${year}`;
  }
}
const storageService = new StorageService();
const excelService = new ExcelService(storageService);
const formController = new FormController(storageService, excelService);
