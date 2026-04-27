'use client';
import { useState, useEffect } from 'react';
import { 
  LightBulbIcon, 
  XMarkIcon, 
  ClockIcon, 
  SparklesIcon,
  CreditCardIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ArrowPathIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

/**
 * Unit Recommendation Component
 * 
 * COMPLETE RULES:
 * 1. WIL (ICT20016) - Only recommend if:
 *    - Student has completed Year 2, Semester 2 OR has 12+ units
 *    - Has NOT taken WIL yet
 *    - When recommended, show as priority but also show 4 alternative units
 * 
 * 2. Project A (COS40005) - Only recommend if:
 *    - Student is in Year 3, Semester 1
 *    - Has completed 175+ credits
 *    - Has NOT taken Project A yet
 * 
 * 3. Project B (COS40006) - Only recommend if:
 *    - Student is in Year 3, Semester 2
 *    - Has completed Project A (COS40005)
 *    - Has NOT taken Project B yet
 * 
 * 4. Regular units - Follow planner order and prerequisites
 */

const UnitRecommendations = ({ 
  isOpen, 
  onClose, 
  planner, 
  completedUnits,
  studentInfo
}) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skippedUnits, setSkippedUnits] = useState([]);
  const [wilRecommendation, setWilRecommendation] = useState(null);
  const [regularRecommendations, setRegularRecommendations] = useState([]);

  useEffect(() => {
    if (isOpen && planner && completedUnits) {
      generateRecommendations();
    }
  }, [isOpen, planner, completedUnits]);

  // Extract unit code
  const extractUnitCode = (unitCodeStr) => {
    if (!unitCodeStr) return '';
    const match = unitCodeStr.match(/[A-Z]{3}\d{5}/i);
    return match ? match[0].toUpperCase() : unitCodeStr.split(' ')[0].toUpperCase();
  };

  // Parse prerequisites string into array of unit codes
  const parsePrerequisites = (prereqString) => {
    if (!prereqString || prereqString === 'Nil' || prereqString === 'nil' || prereqString === 'NIL') {
      return [];
    }
    const matches = prereqString.match(/[A-Z]{3}\d{5}/gi);
    return matches ? matches.map(m => m.toUpperCase()) : [];
  };

  // Check if prerequisites are met
  const arePrerequisitesMet = (unit, completedUnitsMap) => {
    const prerequisites = parsePrerequisites(unit.Prerequisites);
    if (prerequisites.length === 0) return true;
    
    for (const prereq of prerequisites) {
      if (!completedUnitsMap.has(prereq) && !completedUnitsMap.has(prereq.toUpperCase())) {
        return false;
      }
    }
    return true;
  };

  // Check if Project A is completed
  const isProjectACompleted = (completedUnitsMap) => {
    return completedUnitsMap.has('COS40005') || completedUnitsMap.has('COS40005'.toUpperCase());
  };

  // Check if Project B is completed
  const isProjectBCompleted = (completedUnitsMap) => {
    return completedUnitsMap.has('COS40006') || completedUnitsMap.has('COS40006'.toUpperCase());
  };

  // Check if WIL is completed
  const isWILCompleted = (completedUnitsMap) => {
    return completedUnitsMap.has('ICT20016') || completedUnitsMap.has('ICT20016'.toUpperCase());
  };

  // Get semester order value for sorting
  const getSemesterOrder = (unit) => {
    const termId = unit.TermID || unit.termId || unit.semester || '';
    const termLower = termId.toLowerCase();
    const unitCode = unit.UnitCode || '';
    
    // Special case for Capstone
    if (unitCode === 'COS40005') return 9;  // Project A - Year 3 Sem 1
    if (unitCode === 'COS40006') return 10; // Project B - Year 3 Sem 2
    if (unitCode === 'ICT20016') return 11; // WIL - flexible
    
    // Year 1
    if (termLower.includes('year one') && termLower.includes('semester 1')) return 1;
    if (termLower.includes('year one') && termLower.includes('semester 2')) return 2;
    
    // Year 1 Winter/Summer
    if (termLower.includes('winter') && !termLower.includes('year 2')) return 3;
    if (termLower.includes('summer') && !termLower.includes('year 2')) return 4;
    
    // Year 2
    if (termLower.includes('year two') && termLower.includes('semester 1')) return 5;
    if (termLower.includes('year two') && termLower.includes('semester 2')) return 6;
    
    // Year 2 Winter/Summer
    if (termLower.includes('winter') && termLower.includes('year 2')) return 7;
    if (termLower.includes('summer') && termLower.includes('year 2')) return 8;
    
    // Year 3
    if (termLower.includes('year three') && termLower.includes('semester 1')) return 9;
    if (termLower.includes('year three') && termLower.includes('semester 2')) return 10;
    
    return 99;
  };

  // Get display name for semester
  const getSemesterDisplayName = (unit) => {
    const termId = unit.TermID || unit.termId || unit.semester || '';
    const termLower = termId.toLowerCase();
    const unitCode = unit.UnitCode || '';
    
    if (unitCode === 'COS40005') return '🎓 Year 3, Semester 1 (Capstone Project A)';
    if (unitCode === 'COS40006') return '🎓 Year 3, Semester 2 (Capstone Project B)';
    if (unitCode === 'ICT20016') return '💼 Work-Integrated Learning (WIL) - Full-time Placement';
    
    if (termLower.includes('year one') && termLower.includes('semester 1')) return '📚 Year 1, Semester 1';
    if (termLower.includes('year one') && termLower.includes('semester 2')) return '📚 Year 1, Semester 2';
    if (termLower.includes('year two') && termLower.includes('semester 1')) return '📚 Year 2, Semester 1';
    if (termLower.includes('year two') && termLower.includes('semester 2')) return '📚 Year 2, Semester 2';
    if (termLower.includes('year three') && termLower.includes('semester 1')) return '📚 Year 3, Semester 1';
    if (termLower.includes('year three') && termLower.includes('semester 2')) return '📚 Year 3, Semester 2';
    if (termLower.includes('winter')) return '❄️ Winter Term';
    if (termLower.includes('summer')) return '☀️ Summer Term';
    
    return termId || 'Recommended';
  };

  // Check if student is eligible for WIL
  const isWILEligible = (totalUnitsCompleted, studentYear, studentSemester) => {
    // WIL requires: Completed Year 2 Semester 2 OR at least 12 units
    const hasCompletedYear2Sem2 = (studentYear > 2) || (studentYear === 2 && studentSemester >= 2);
    return hasCompletedYear2Sem2 && totalUnitsCompleted >= 12;
  };

  // Check if student is eligible for Project A
  const isProjectAEligible = (totalCredits, studentYear, studentSemester) => {
    // Project A requires: Year 3 Semester 1 AND 175+ credits
    const isCorrectYearSemester = (studentYear === 3 && studentSemester === 1);
    return isCorrectYearSemester && totalCredits >= 175;
  };

  // Check if student is eligible for Project B
  const isProjectBEligible = (completedUnitsMap, studentYear, studentSemester) => {
    // Project B requires: Year 3 Semester 2 AND Project A completed
    const isCorrectYearSemester = (studentYear === 3 && studentSemester === 2);
    return isCorrectYearSemester && isProjectACompleted(completedUnitsMap);
  };

  // Check if unit is completed
  const isUnitCompleted = (unit, completedUnitsMap) => {
    const unitCode = extractUnitCode(unit.UnitCode);
    return completedUnitsMap.has(unitCode) || completedUnitsMap.has(unitCode.toUpperCase());
  };

  const generateRecommendations = () => {
    setLoading(true);
    
    try {
      const plannerUnits = planner?.totalUnits || [];
      
      // Create map of completed units
      const completedUnitsMap = new Map();
      completedUnits.forEach(unit => {
        completedUnitsMap.set(unit.code, unit);
        completedUnitsMap.set(unit.code?.toUpperCase(), unit);
      });
      
      // Calculate totals
      const totalCredits = completedUnits.reduce((sum, u) => sum + (u.creditPoints || 0), 0);
      const totalUnitsCompleted = completedUnits.length;
      
      // Get student's current year and semester
      const currentYear = studentInfo?.currentYear || 1;
      const currentSemester = studentInfo?.currentSemester || 1;
      
      // Sort planner units by semester order
      const sortedPlannerUnits = [...plannerUnits].sort((a, b) => {
        return getSemesterOrder(a) - getSemesterOrder(b);
      });
      
      // Check WIL status
      const wilCompleted = isWILCompleted(completedUnitsMap);
      const wilEligible = isWILEligible(totalUnitsCompleted, currentYear, currentSemester);
      
      let wilUnitData = null;
      if (!wilCompleted && wilEligible) {
        // Find WIL unit in planner
        const wilUnit = plannerUnits.find(unit => {
          const unitCode = unit.UnitCode || '';
          return unitCode === 'ICT20016';
        });
        
        if (wilUnit) {
          wilUnitData = {
            ...wilUnit,
            extractedCode: extractUnitCode(wilUnit.UnitCode),
            creditPoints: wilUnit.CreditPoints || 25,
            semesterDisplay: getSemesterDisplayName(wilUnit),
            isEligible: true,
            statusMessage: '✅ Eligible for WIL internship',
            statusType: 'success'
          };
        }
      }
      
      // Determine target semester order based on student's current position
      let targetSemesterOrder = 1;
      if (currentYear === 1 && currentSemester === 1) targetSemesterOrder = 1;
      else if (currentYear === 1 && currentSemester === 2) targetSemesterOrder = 2;
      else if (currentYear === 2 && currentSemester === 1) targetSemesterOrder = 5;
      else if (currentYear === 2 && currentSemester === 2) targetSemesterOrder = 6;
      else if (currentYear === 3 && currentSemester === 1) targetSemesterOrder = 9;
      else if (currentYear === 3 && currentSemester === 2) targetSemesterOrder = 10;
      
      // Find regular missing units (excluding WIL, Project A, Project B for now)
      const regularMissingUnits = [];
      
      for (let i = 0; i < sortedPlannerUnits.length; i++) {
        const unit = sortedPlannerUnits[i];
        const isCompleted = isUnitCompleted(unit, completedUnitsMap);
        const unitCode = unit.UnitCode || '';
        const unitOrder = getSemesterOrder(unit);
        
        // Skip WIL, Project A, Project B for regular recommendations
        if (unitCode === 'ICT20016' || unitCode === 'COS40005' || unitCode === 'COS40006') {
          continue;
        }
        
        if (!isCompleted && unitOrder >= targetSemesterOrder) {
          regularMissingUnits.push(unit);
        }
      }
      
      // Check Project A eligibility
      const projectACompleted = isProjectACompleted(completedUnitsMap);
      const projectAEligible = isProjectAEligible(totalCredits, currentYear, currentSemester);
      
      let projectARecommendation = null;
      if (!projectACompleted && projectAEligible) {
        const projectAUnit = plannerUnits.find(unit => {
          const unitCode = unit.UnitCode || '';
          return unitCode === 'COS40005';
        });
        
        if (projectAUnit) {
          const prereqsMet = arePrerequisitesMet(projectAUnit, completedUnitsMap);
          projectARecommendation = {
            ...projectAUnit,
            extractedCode: extractUnitCode(projectAUnit.UnitCode),
            creditPoints: projectAUnit.CreditPoints || 25,
            semesterDisplay: getSemesterDisplayName(projectAUnit),
            isEligible: prereqsMet,
            statusMessage: prereqsMet ? '✅ Eligible for Capstone Project A' : '⚠️ Check prerequisites',
            statusType: prereqsMet ? 'success' : 'warning',
            prerequisitesMet: prereqsMet
          };
        }
      }
      
      // Check Project B eligibility
      const projectBCompleted = isProjectBCompleted(completedUnitsMap);
      const projectBEligible = isProjectBEligible(completedUnitsMap, currentYear, currentSemester);
      
      let projectBRecommendation = null;
      if (!projectBCompleted && projectBEligible) {
        const projectBUnit = plannerUnits.find(unit => {
          const unitCode = unit.UnitCode || '';
          return unitCode === 'COS40006';
        });
        
        if (projectBUnit) {
          const prereqsMet = arePrerequisitesMet(projectBUnit, completedUnitsMap);
          projectBRecommendation = {
            ...projectBUnit,
            extractedCode: extractUnitCode(projectBUnit.UnitCode),
            creditPoints: projectBUnit.CreditPoints || 25,
            semesterDisplay: getSemesterDisplayName(projectBUnit),
            isEligible: prereqsMet && projectACompleted,
            statusMessage: (prereqsMet && projectACompleted) ? '✅ Eligible for Capstone Project B' : '⚠️ Requires Project A first',
            statusType: (prereqsMet && projectACompleted) ? 'success' : 'warning',
            prerequisitesMet: prereqsMet
          };
        }
      }
      
      // Get regular recommendations (up to 4)
      let regularRecs = [];
      for (const unit of regularMissingUnits) {
        const prereqsMet = arePrerequisitesMet(unit, completedUnitsMap);
        const isEligible = prereqsMet;
        
        regularRecs.push({
          ...unit,
          extractedCode: extractUnitCode(unit.UnitCode),
          creditPoints: unit.CreditPoints || 12.5,
          semesterDisplay: getSemesterDisplayName(unit),
          isEligible: isEligible,
          statusMessage: isEligible ? '✅ Ready to take' : '⚠️ Prerequisites needed',
          statusType: isEligible ? 'success' : 'warning',
          prerequisitesMet: prereqsMet
        });
        
        if (regularRecs.length >= 4) break;
      }
      
      // Also consider Project A and Project B as regular recommendations if eligible
      if (projectARecommendation && regularRecs.length < 4) {
        regularRecs.push(projectARecommendation);
      }
      
      if (projectBRecommendation && regularRecs.length < 4) {
        regularRecs.push(projectBRecommendation);
      }
      
      // Find skipped units for display
      const skipped = regularMissingUnits.slice(regularRecs.length, regularRecs.length + 4);
      const skippedWithInfo = skipped.map(unit => ({
        ...unit,
        extractedCode: extractUnitCode(unit.UnitCode),
        semesterDisplay: getSemesterDisplayName(unit)
      }));
      
      setWilRecommendation(wilUnitData);
      setRegularRecommendations(regularRecs);
      setSkippedUnits(skippedWithInfo);
      
      setRecommendations({
        wilRecommendation: wilUnitData,
        regularRecommendations: regularRecs,
        hasWILOption: wilUnitData !== null,
        totalPlannerUnits: plannerUnits.length,
        totalCompleted: totalUnitsCompleted,
        totalRemaining: regularMissingUnits.length + (projectARecommendation ? 1 : 0) + (projectBRecommendation ? 1 : 0),
        totalCredits: totalCredits,
        plannerName: planner?.plannerName,
        completedPercent: (totalUnitsCompleted / plannerUnits.length) * 100,
        currentYear: currentYear,
        currentSemester: currentSemester
      });
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <AcademicCapIcon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Unit Recommendations</h2>
                <p className="text-emerald-100 text-sm">{recommendations?.plannerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Modal Body */}
        <div className="p-6">
          
          {/* Student Progress Summary */}
          {studentInfo && (
            <div className="bg-emerald-50 rounded-xl p-4 mb-6 border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <UserGroupIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-800">Student Information</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Student ID:</span>
                  <p className="font-semibold">{studentInfo.studentId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Current Year:</span>
                  <p className="font-semibold text-blue-600">Year {recommendations?.currentYear || '?'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Current Semester:</span>
                  <p className="font-semibold text-blue-600">Semester {recommendations?.currentSemester || '?'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Completed Units:</span>
                  <p className="font-semibold text-emerald-600">{recommendations?.totalCompleted || 0}</p>
                </div>
              </div>
              
              <div className="border-t border-emerald-200 pt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Degree Progress</span>
                  <span>{recommendations?.completedPercent?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${recommendations?.completedPercent || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <ArrowPathIcon className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Analyzing your study planner...</p>
            </div>
          )}
          
          {/* WIL Recommendation Section */}
          {!loading && recommendations?.hasWILOption && (
            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <BriefcaseIcon className="h-6 w-6 text-orange-600" />
                  <h3 className="font-bold text-orange-800">WIL Internship Available</h3>
                </div>
                
                {recommendations.wilRecommendation && (
                  <div className="border-2 border-orange-300 rounded-xl p-4 bg-white mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xl font-bold text-orange-800">
                          {recommendations.wilRecommendation.extractedCode}
                        </span>
                        {recommendations.wilRecommendation.Name && (
                          <p className="text-sm text-gray-600 mt-1">{recommendations.wilRecommendation.Name}</p>
                        )}
                      </div>
                      <div className="bg-orange-100 rounded-full px-2 py-1">
                        <span className="text-sm font-bold text-orange-700">{recommendations.wilRecommendation.creditPoints} CP</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{recommendations.wilRecommendation.semesterDisplay}</div>
                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded-lg mt-2">
                      {recommendations.wilRecommendation.statusMessage}
                    </div>
                  </div>
                )}
                
                <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
                  <strong>⚠️ Important:</strong> WIL is a full-time 3-month placement. You cannot take any other units during this semester.
                </div>
              </div>
            </div>
          )}
          
          {/* Regular Recommendations Section */}
          {!loading && recommendations && recommendations.regularRecommendations.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-800">
                  Recommended Units to Take
                </h3>
                <span className="text-xs text-gray-400">(Following planner order)</span>
              </div>
              
              {/* If WIL is available, add note about alternatives */}
              {recommendations.hasWILOption && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>📌 Alternative Options:</strong> If you prefer not to take WIL this semester, here are other units you can take:
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {recommendations.regularRecommendations.map((unit, idx) => (
                  <div 
                    key={idx} 
                    className={`border-2 rounded-xl p-4 transition-all ${
                      unit.statusType === 'success' 
                        ? 'border-emerald-300 bg-emerald-50' 
                        : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xl font-bold text-gray-800">
                            {unit.extractedCode}
                          </span>
                          {unit.Type === 'Core' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Core</span>
                          )}
                          {unit.UnitCode === 'COS40005' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Capstone A</span>
                          )}
                          {unit.UnitCode === 'COS40006' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Capstone B</span>
                          )}
                        </div>
                        {unit.Name && (
                          <p className="text-sm text-gray-600 mt-1">{unit.Name}</p>
                        )}
                      </div>
                      <div className="bg-white rounded-full px-2 py-1 ml-2">
                        <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                          <CreditCardIcon className="h-3 w-3" />
                          {unit.creditPoints} CP
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">{unit.semesterDisplay}</div>
                    
                    <div className={`text-sm p-2 rounded-lg ${
                      unit.statusType === 'success' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {unit.statusMessage}
                    </div>
                    
                    {!unit.prerequisitesMet && unit.Prerequisites && unit.Prerequisites !== 'Nil' && (
                      <div className="text-xs text-amber-600 mt-2">
                        <strong>Required prerequisites:</strong> {unit.Prerequisites}
                      </div>
                    )}
                    
                    {unit.UnitCode === 'COS40005' && (
                      <div className="text-xs text-purple-600 mt-2">
                        📌 After completing this, you can take Capstone Project B in Semester 2.
                      </div>
                    )}
                    
                    {unit.UnitCode === 'COS40006' && (
                      <div className="text-xs text-purple-600 mt-2">
                        🎓 Final Capstone Project - Complete this to graduate!
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Skipped Units */}
              {skippedUnits.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                    <h4 className="font-semibold text-gray-600 text-sm">Upcoming Units (Next in line)</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skippedUnits.map((unit, idx) => (
                      <span key={idx} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        {unit.extractedCode}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* No Recommendations State */}
          {!loading && recommendations && recommendations.regularRecommendations.length === 0 && !recommendations.hasWILOption && (
            <div className="text-center py-12">
              <div className="bg-emerald-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="text-gray-700 text-lg font-medium">🎓 Congratulations!</p>
              <p className="text-gray-500 mt-2">
                You have completed all units in this study planner!
              </p>
            </div>
          )}
          
          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              {recommendations?.hasWILOption 
                ? "💼 WIL is available - you may take it OR choose from the alternatives above" 
                : "Recommendations follow planner order and check prerequisites"}
            </p>
            <button
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitRecommendations;